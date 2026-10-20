import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Frame, Page } from "playwright-core";
import { openTeamsNavigation } from "./teams-navigation.js";
import { assignmentClassCombo, retryAssignmentListReturn, selectAssignmentClass, waitForAssignmentListSettled, type TeamsAssignmentSnapshot } from "./teams-assignments.js";
import { assignmentSchoolFileRelativePath, readSchoolDownload } from "./teams-powerpoints.js";

const assignmentOrigin = "https://assignments.edu.cloud.microsoft";
const supportedFile = /\.(?:pptx|pdf|docx|xlsx)$/i;
const maxFiles = 512;
const maxBatchBytes = 1024 * 1024 * 1024;

type ManifestItem = { relativePath: string; stagedName: string; sha256: string; byteLength: number; modifiedAt: string };

function assignmentFrame(page: Page): Frame {
  const frames = page.frames().filter(frame => {
    try { return new URL(frame.url()).origin === assignmentOrigin; } catch { return false; }
  });
  if (frames.length !== 1) throw new Error("teams_assignment_files_frame_missing_or_ambiguous");
  return frames[0];
}

export function validateAssignmentFileSnapshot(snapshot: TeamsAssignmentSnapshot): void {
  if (snapshot.version !== "omega_teams_assignments_json_v1" || snapshot.source_origin !== assignmentOrigin || !Array.isArray(snapshot.records) || snapshot.records.length < 1 || snapshot.records.length > 500) throw new Error("teams_assignment_files_snapshot_invalid");
  const keys = new Set<string>();
  for (const record of snapshot.records) {
    if (typeof record.classExternalId !== "string" || !record.classExternalId || record.classExternalId.length > 200 || typeof record.assignmentExternalId !== "string" || !record.assignmentExternalId || record.assignmentExternalId.length > 200 || typeof record.courseTitle !== "string" || !record.courseTitle || record.courseTitle.length > 500 || !["available", "not_assigned"].includes(record.detailState) || !Array.isArray(record.linkedFileNames) || record.linkedFileNames.length > 100 || record.linkedFileNames.some(name => typeof name !== "string" || !name || name.length > 500)) throw new Error("teams_assignment_files_snapshot_record_invalid");
    const url = new URL(record.detailUrl);
    if (url.origin !== assignmentOrigin || url.username || url.password || url.search || url.hash || url.pathname !== `/classes/${encodeURIComponent(record.classExternalId)}/assignments/${encodeURIComponent(record.assignmentExternalId)}`) throw new Error("teams_assignment_files_snapshot_route_invalid");
    const key = `${record.classExternalId}:${record.assignmentExternalId}`;
    if (keys.has(key)) throw new Error("teams_assignment_files_snapshot_duplicate");
    keys.add(key);
  }
}

export async function collectTeamsAssignmentFiles(source: Page, snapshot: TeamsAssignmentSnapshot, stagingRoot: string, recordIndexOnly?: number): Promise<{ manifest: { version: "omega_personal_files_v1"; deviceKey: "teams-sharepoint"; items: ManifestItem[] }; report: { assignments: number; resources: number; eligible: number; downloaded: number; unsupported: number; bytes: number; coverageComplete: false; coverageLimitation: string } }> {
  validateAssignmentFileSnapshot(snapshot);
  if (recordIndexOnly !== undefined && (!Number.isInteger(recordIndexOnly) || recordIndexOnly < 0 || recordIndexOnly >= snapshot.records.length)) throw new Error("teams_assignment_files_record_index_invalid");
  const sourceUrl = new URL(source.url());
  if (!["https://teams.microsoft.com", "https://teams.cloud.microsoft"].includes(sourceUrl.origin) || sourceUrl.username || sourceUrl.password) throw new Error("teams_assignment_files_source_invalid");
  const probe = await source.context().newPage();
  const items: ManifestItem[] = [];
  let resources = 0, eligible = 0, unsupported = 0, bytes = 0;
  let stage = "open";
  await mkdir(path.join(stagingRoot, "files"), { recursive: true });
  try {
    await probe.goto(source.url(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    stage = "navigation";
    await openTeamsNavigation(probe, "assignments");
    let frame: Frame | null = null;
    for (let attempt = 0; attempt < 100 && !frame; attempt++) {
      try { frame = assignmentFrame(probe); } catch { await probe.waitForTimeout(250); }
    }
    if (!frame) throw new Error("teams_assignment_files_frame_not_loaded");
    stage = "list_navigation";
    const viewAssignments = frame.getByRole("link", { name: /^View assignments$/i });
    let listReady = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (new URL(frame.url()).pathname === "/classes/all/list") { listReady = true; break; }
      if (await viewAssignments.count() === 1 && await viewAssignments.isVisible()) { await viewAssignments.click(); listReady = true; break; }
      await probe.waitForTimeout(250);
    }
    if (!listReady) throw new Error("teams_assignment_files_list_unavailable");
    const listUrl = `${assignmentOrigin}/classes/all/list`;
    const sections = [["upcoming", "Upcoming"], ["past_due", "Past due"], ["completed", "Completed"]] as const;
    for (const [section, label] of sections) {
      const sectionRecords = snapshot.records.map((record, recordIndex) => ({ record, recordIndex })).filter(({ record, recordIndex }) => record.listSection === section && record.detailState === "available" && record.linkedFileNames.length > 0 && (recordIndexOnly === undefined || recordIndexOnly === recordIndex));
      if (!sectionRecords.length) continue;
      stage = `section_${section}`;
      frame = assignmentFrame(probe);
      await frame.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const tab = frame.getByRole("tab", { name: new RegExp(label, "i") });
      await tab.waitFor({ timeout: 25_000 });
      await tab.click();
      await waitForAssignmentListSettled(frame);
      const classCombo = await assignmentClassCombo(frame);
      await classCombo.click();
      const classCount = await frame.locator('[role="option"]:visible').count();
      if (classCount < 1 || classCount > 30) throw new Error("teams_assignment_files_class_count_invalid");
      const filterByAssignmentId = new Map<string, number>();
      for (let classIndex = 0; classIndex < classCount; classIndex++) {
        if (classIndex > 0) await classCombo.click();
        await frame.locator('[role="option"]:visible').nth(classIndex).click();
        await frame.waitForTimeout(1_000);
        await waitForAssignmentListSettled(frame);
        for (const id of await frame.locator(".aui-assignmentListCard").evaluateAll(elements => elements.map(element => element.id))) filterByAssignmentId.set(id, classIndex);
      }
      if (sectionRecords.some(({ record }) => !filterByAssignmentId.has(record.assignmentExternalId))) throw new Error("teams_assignment_files_class_coverage_incomplete");
      for (const { record, recordIndex } of sectionRecords) {
        stage = `detail_open_${recordIndex}`;
        try { frame = await retryAssignmentListReturn(async () => {
          const current = assignmentFrame(probe);
          await current.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
          const reopened = current.getByRole("tab", { name: new RegExp(label, "i") });
          await reopened.waitFor({ timeout: 25_000 });
          await reopened.click();
          await waitForAssignmentListSettled(current);
          await selectAssignmentClass(current, filterByAssignmentId.get(record.assignmentExternalId)!);
          if (await current.locator(`[id="${record.assignmentExternalId}"]`).count() !== 1) throw new Error("teams_assignment_files_card_changed");
          return current;
        }, milliseconds => probe.waitForTimeout(milliseconds)); }
        catch { throw new Error(`teams_assignment_files_list_return_${recordIndex}_failed`); }
        const card = frame.locator(`[id="${record.assignmentExternalId}"]`);
        await card.click();
        stage = `detail_wait_${recordIndex}`;
        await frame.locator('[class*="assignment-details-container"]').waitFor({ timeout: 25_000 });
        if (new URL(frame.url()).origin !== assignmentOrigin || new URL(frame.url()).pathname !== new URL(record.detailUrl).pathname) throw new Error("teams_assignment_files_detail_redirected");
        stage = `file_container_${recordIndex}`;
        await frame.locator('[class*="assignment-details-files-container"]').first().waitFor({ timeout: 15_000 });
        stage = `resource_read_${recordIndex}`;
        const resourceButtons = frame.locator('[class*="assignment-details-files-container"] [class*="resource-well"] button[class*="open-button"]');
        let names: string[] = [], prior = "", stable = 0;
        for (let attempt = 0; attempt < 30; attempt++) {
          const current = (await resourceButtons.allTextContents()).map(value => value.replace(/\s+/g, " ").trim());
          const signature = JSON.stringify(current);
          stable = signature === prior ? stable + 1 : 0;
          prior = signature;
          if (stable >= 3 && current.length > 0) { names = current; break; }
          await frame.waitForTimeout(500);
        }
        if (names.length > 100 || names.some(name => !name || name.length > 500)) throw new Error("teams_assignment_files_resource_list_invalid");
        if (!names.length) throw new Error(`teams_assignment_files_resource_list_missing_${recordIndex}`);
        resources += names.length;
        const duplicates = new Map<string, number>();
        for (const [index, name] of names.entries()) {
          if (!supportedFile.test(name)) { unsupported++; continue; }
          stage = `download_${recordIndex}_${index}`;
          eligible++;
          if (items.length >= maxFiles) throw new Error("teams_assignment_files_count_limit_exceeded");
          const ordinal = duplicates.get(name) ?? 0;
          duplicates.set(name, ordinal + 1);
          const relativePath = assignmentSchoolFileRelativePath(record.courseTitle, record.classExternalId, record.assignmentExternalId, name, ordinal);
          const more = resourceButtons.nth(index).locator('xpath=..').locator('button[class*="more-options-button"]');
          if (await more.count() !== 1) throw new Error("teams_assignment_files_menu_ambiguous");
          const action = frame.getByRole("menuitem", { name: "Download", exact: true });
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              stage = `menu_click_${recordIndex}_${index}`;
              if (!await action.isVisible()) await more.click();
              if (await action.count() !== 1) throw new Error("teams_assignment_files_download_action_missing");
              stage = `download_event_${recordIndex}_${index}`;
              const download = await Promise.all([probe.waitForEvent("download", { timeout: 30_000 }), action.click({ timeout: 10_000, noWaitAfter: true })]).then(([item]) => item);
              stage = `download_validate_${recordIndex}_${index}`;
              const contents = await readSchoolDownload(download, stagingRoot, name, bytes);
              if (bytes + contents.length > maxBatchBytes) throw new Error("teams_assignment_files_download_size_invalid");
              stage = `download_stage_${recordIndex}_${index}`;
              const sha256 = createHash("sha256").update(contents).digest("hex");
              const stagedPath = path.join(stagingRoot, "files", sha256);
              await writeFile(stagedPath, contents, { flag: "wx" }).catch(async error => {
                if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
                if (createHash("sha256").update(await readFile(stagedPath)).digest("hex") !== sha256) throw new Error("teams_assignment_files_staged_hash_mismatch");
              });
              items.push({ relativePath, stagedName: sha256, sha256, byteLength: contents.length, modifiedAt: new Date().toISOString() });
              bytes += contents.length;
              break;
            } catch (caught) {
              if (attempt === 2 || (caught instanceof Error && /^(?:teams_assignment_files_(?:count_limit_exceeded|download_size_invalid|download_type_changed|staged_hash_mismatch)|teams_school_file_size_invalid)$/.test(caught.message))) throw caught;
              await frame.waitForTimeout(500 * (attempt + 1));
            }
          }
        }
      }
    }
    return { manifest: { version: "omega_personal_files_v1", deviceKey: "teams-sharepoint", items }, report: { assignments: snapshot.records.length, resources, eligible, downloaded: items.length, unsupported, bytes, coverageComplete: false, coverageLimitation: "Only rendered assignment PPTX/PDF/DOCX/XLSX resources were downloaded; other formats, older server-side history, and submission files remain unverified." } };
  } catch (caught) {
    if (caught instanceof Error && /^teams_[a-z0-9_]{1,95}$/.test(caught.message)) throw caught;
    throw new Error(`teams_assignment_files_${stage}_failed`);
  } finally { await probe.close(); }
}
