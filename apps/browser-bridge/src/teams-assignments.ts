import type { Frame, Page } from "playwright-core";

export type TeamsAssignmentSnapshot = {
  version: "omega_teams_assignments_json_v1";
  source_timestamp: string;
  source_origin: "https://assignments.edu.cloud.microsoft";
  coverage: { listRoute: string; visibleCardCount: number; capturedDetailCount: number; complete: boolean; limitation: string | null };
  records: Array<{
    classExternalId: string;
    assignmentExternalId: string;
    title: string;
    courseTitle: string;
    dueSummary: string;
    instructions: string;
    metadataText: string;
    pointsText: string;
    cardText: string;
    linkedFileNames: string[];
    detailUrl: string;
    listSection: "upcoming" | "past_due" | "completed";
    detailState: "available" | "not_assigned";
  }>;
};

const assignmentOrigin = "https://assignments.edu.cloud.microsoft" as const;
const teamsOrigins = new Set(["https://teams.microsoft.com", "https://teams.cloud.microsoft"]);
type AssignmentCard = { id: string; text: string; title: string; dueSummary: string; courseTitle: string; classFilterIndex: number | null };

function assignmentFrame(page: Page): Frame {
  const frames = page.frames().filter(frame => {
    try { return new URL(frame.url()).origin === assignmentOrigin; } catch { return false; }
  });
  if (frames.length !== 1) throw new Error("teams_assignments_frame_missing_or_ambiguous");
  return frames[0];
}

function assignmentIdentity(urlText: string): { classExternalId: string; assignmentExternalId: string } {
  const url = new URL(urlText);
  if (url.origin !== assignmentOrigin || url.username || url.password || url.port) throw new Error("teams_assignment_detail_origin_invalid");
  const match = /^\/classes\/([^/]+)\/assignments\/([^/]+)$/.exec(url.pathname);
  if (!match || match[1].length > 200 || match[2].length > 200) throw new Error("teams_assignment_detail_route_changed");
  return { classExternalId: decodeURIComponent(match[1]), assignmentExternalId: decodeURIComponent(match[2]) };
}

export async function waitForAssignmentListSettled(frame: Frame, quietSamples = 5): Promise<void> {
  let previous = "", stable = 0;
  for (let attempt = 0; attempt < 70; attempt++) {
    const ids = await frame.locator(".aui-assignmentListCard").evaluateAll(elements => elements.map(element => element.id).join("|"));
    stable = attempt >= 3 && ids === previous ? stable + 1 : 0;
    if (stable >= quietSamples) return;
    previous = ids;
    await frame.waitForTimeout(500);
  }
  throw new Error("teams_assignment_list_not_settled");
}

async function readAssignmentCards(frame: Frame, classFilterIndex: number | null): Promise<AssignmentCard[]> {
  return frame.locator(".aui-assignmentListCard").evaluateAll((elements, filterIndex) => elements.map(element => ({
    id: element.id,
    text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
    title: (element.querySelector('[class*="CardHeader__title"], h2, h3')?.textContent ?? "").replace(/\s+/g, " ").trim(),
    dueSummary: (element.querySelector('[class*="CardHeader__description"]')?.children[1] ? element.querySelector('[class*="CardHeader__description"]')?.children[0]?.textContent : "")?.replace(/\s+/g, " ").trim() ?? "",
    courseTitle: (element.querySelector('[class*="CardHeader__description"]')?.children[1]?.textContent ?? element.querySelector('[class*="CardHeader__description"]')?.children[0]?.textContent ?? "").replace(/\s+/g, " ").trim(),
    classFilterIndex: filterIndex,
  })), classFilterIndex);
}

export async function assignmentClassCombo(frame: Frame) {
  const classCombo = frame.locator('[data-test="list-class-selector"]');
  if (await classCombo.count() !== 1 || !await classCombo.isVisible()) {
    const openFilter = frame.getByRole("button", { name: "Open filter pane" });
    if (await openFilter.count() !== 1) throw new Error("teams_assignment_filter_pane_ambiguous");
    await openFilter.click();
  }
  await classCombo.waitFor({ state: "visible", timeout: 10_000 });
  if (await classCombo.count() !== 1) throw new Error("teams_assignment_class_filter_ambiguous");
  return classCombo;
}

export async function selectAssignmentClass(frame: Frame, optionIndex: number): Promise<void> {
  const classCombo = await assignmentClassCombo(frame);
  await classCombo.click();
  const option = frame.locator('[role="option"]:visible').nth(optionIndex);
  await option.waitFor({ timeout: 10_000 });
  await option.click();
  await frame.waitForTimeout(1_000);
  await waitForAssignmentListSettled(frame);
  const closeFilter = frame.getByRole("button", { name: "Close filter pane" });
  if (await closeFilter.count() === 1 && await closeFilter.isVisible()) await closeFilter.click();
}

export async function retryAssignmentListReturn<T>(attempt: () => Promise<T>, wait: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))): Promise<T> {
  for (let retry = 0; retry < 3; retry++) {
    try { return await attempt(); }
    catch (error) {
      if (retry === 2) throw new Error("teams_assignment_list_return_failed", { cause: error });
      await wait(500 * (retry + 1));
    }
  }
  throw new Error("teams_assignment_list_return_failed");
}

export async function collectTeamsAssignments(signedInPage: Page): Promise<TeamsAssignmentSnapshot> {
  const start = new URL(signedInPage.url());
  if (!teamsOrigins.has(start.origin) || start.username || start.password) throw new Error("teams_signed_in_tab_origin_invalid");
  const probe = await signedInPage.context().newPage();
  let stage = "open";
  try {
    await probe.goto(signedInPage.url(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!teamsOrigins.has(new URL(probe.url()).origin)) throw new Error("teams_probe_left_registered_origin");
    stage = "navigation";
    const nav = probe.getByRole("button", { name: /^Assignments \(Ctrl\+Shift\+4\)$/ });
    await nav.waitFor({ timeout: 25_000 });
    if (await nav.count() !== 1) throw new Error("teams_assignments_navigation_ambiguous");
    await nav.click();
    let frame: Frame | null = null;
    for (let attempt = 0; attempt < 100 && !frame; attempt++) {
      try { frame = assignmentFrame(probe); } catch { await probe.waitForTimeout(250); }
    }
    if (!frame) throw new Error("teams_assignments_frame_not_loaded");
    // The embedded app may restore directly to the list or pass through its
    // landing page while loading. Wait for either state; never infer an empty
    // list from the loading shell.
    stage = "list_navigation_wait";
    const viewAssignments = frame.getByRole("link", { name: /^View assignments$/i });
    let listReady = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (new URL(frame.url()).pathname === "/classes/all/list") { listReady = true; break; }
      const linkCount = await viewAssignments.count();
      if (linkCount > 1) throw new Error("teams_view_assignments_navigation_ambiguous");
      if (linkCount === 1 && await viewAssignments.isVisible()) {
        stage = "list_navigation_click";
        await viewAssignments.click();
        listReady = true;
        break;
      }
      await probe.waitForTimeout(250);
    }
    if (!listReady) throw new Error("teams_assignment_list_navigation_unavailable");
    stage = "list_tabs_wait";
    await frame.getByRole("tab", { name: /^Upcoming\b/i }).waitFor({ timeout: 25_000 });
    const listUrl = frame.url();
    const parsedList = new URL(listUrl);
    if (parsedList.origin !== assignmentOrigin || parsedList.pathname !== "/classes/all/list" || parsedList.search || parsedList.hash) throw new Error("teams_assignment_list_route_changed");
    stage = "list_read";
    const records: TeamsAssignmentSnapshot["records"] = [];
    const sections = [["upcoming", "Upcoming"], ["past_due", "Past due"], ["completed", "Completed"]] as const;
    for (const [listSection, label] of sections) {
      stage = `section_${listSection}_open`;
      frame = assignmentFrame(probe);
      if (new URL(frame.url()).pathname !== "/classes/all/list") {
        await frame.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await probe.waitForTimeout(3_000);
      }
      const tab = frame.getByRole("tab", { name: new RegExp(label, "i") });
      await tab.waitFor({ timeout: 25_000 });
      if (await tab.count() !== 1) throw new Error("teams_assignment_section_ambiguous");
      const selectedBefore = await tab.getAttribute("aria-selected") === "true";
      await tab.click();
      if (!selectedBefore) {
        await frame.waitForFunction(tabName => [...document.querySelectorAll<HTMLElement>('[role="tab"][aria-selected="true"]')]
          .some(item => new RegExp(tabName, "i").test((item.getAttribute("aria-label") ?? item.textContent ?? "").trim())), label, { timeout: 25_000 }).catch(() => { throw new Error("teams_assignment_section_transition_unverified"); });
      }
      await waitForAssignmentListSettled(frame, 24);
      const unfiltered = await readAssignmentCards(frame, null);
      const cardsById = new Map<string, AssignmentCard>();
      stage = `section_${listSection}_class_filter`;
      const classCombo = await assignmentClassCombo(frame);
      await classCombo.click();
      const classCount = await frame.locator('[role="option"]:visible').count();
      if (classCount < 1 || classCount > 30) throw new Error("teams_assignment_class_filter_count_invalid");
      for (let classIndex = 0; classIndex < classCount; classIndex++) {
        stage = `section_${listSection}_class_${classIndex}`;
        if (classIndex > 0) await classCombo.click();
        const option = frame.locator('[role="option"]:visible').nth(classIndex);
        await option.click();
        await frame.waitForTimeout(1_000);
        await waitForAssignmentListSettled(frame);
        for (const card of await readAssignmentCards(frame, classIndex)) if (!cardsById.has(card.id)) cardsById.set(card.id, card);
      }
      const cards = [...cardsById.values()];
      if (unfiltered.some(card => !cardsById.has(card.id))) throw new Error("teams_assignment_class_filter_coverage_incomplete");
      console.log(JSON.stringify({ provider: "teams-assignments", section: listSection, unfilteredCardCount: unfiltered.length, classFilterCount: classCount, capturedCardCount: cards.length }));
      if (records.length + cards.length > 500 || cards.some(card => !card.id || !card.text || !card.courseTitle || card.text.length > 8_000 || card.courseTitle.length > 500 || card.dueSummary.length > 500)) {
        console.log(JSON.stringify({ provider: "teams-assignments", section: listSection, cardCount: cards.length, cardShape: cards.map(card => ({ idPresent: Boolean(card.id), textLength: card.text.length, titleLength: card.title.length, dueLength: card.dueSummary.length, courseLength: card.courseTitle.length })).slice(0, 30) }));
        throw new Error("teams_assignment_list_invalid_or_unbounded");
      }
      // Each detail is reopened through its class filter. Teams can omit
      // class-only records from the nominally unfiltered list, and a filter
      // clear does not consistently restore that list in the same session.
      stage = `section_${listSection}_detail_list`;
      await frame.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await frame.getByRole("tab", { name: new RegExp(label, "i") }).click();
      await waitForAssignmentListSettled(frame);
      for (const [index, captured] of cards.entries()) {
        if (index > 0) {
          stage = "list_return";
          let returnStage = "frame";
          try {
            frame = await retryAssignmentListReturn(async () => {
              returnStage = "frame";
              const current = assignmentFrame(probe);
              returnStage = "navigate";
              await current.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
              returnStage = "tab";
              const reopened = current.getByRole("tab", { name: new RegExp(label, "i") });
              await reopened.waitFor({ timeout: 25_000 });
              if (await reopened.count() !== 1) throw new Error("teams_assignment_section_ambiguous");
              await reopened.click();
              returnStage = "settle";
              await waitForAssignmentListSettled(current);
              returnStage = "filter";
              if (captured.classFilterIndex === null) throw new Error("teams_assignment_class_filter_missing");
              await selectAssignmentClass(current, captured.classFilterIndex);
              returnStage = "card";
              await current.locator(`[id="${captured.id}"]`).waitFor({ timeout: 25_000 });
              return current;
            }, milliseconds => probe.waitForTimeout(milliseconds));
          } catch {
            throw new Error(`teams_assignment_list_return_${returnStage}_failed`);
          }
        }
        if (index === 0) {
          if (captured.classFilterIndex === null) throw new Error("teams_assignment_class_filter_missing");
          await selectAssignmentClass(frame, captured.classFilterIndex);
        }
        const card = frame.locator(`[id="${captured.id}"]`);
        if (await card.count() !== 1) throw new Error("teams_assignment_card_changed_during_capture");
        stage = `detail_open_${listSection}_${index}`;
        await card.click();
        stage = `detail_wait_${listSection}_${index}`;
        await Promise.race([
          frame.locator('[class*="assignment-details-container"]').waitFor({ timeout: 25_000 }),
          frame.getByText("Looks like you haven't been added to this assignment.", { exact: true }).waitFor({ timeout: 25_000 }),
        ]);
        const ids = assignmentIdentity(frame.url());
        if (await frame.getByText("Looks like you haven't been added to this assignment.", { exact: true }).count() === 1) {
          const detailUrl = new URL(frame.url());
          const visibleTitle = captured.title || captured.text.split(captured.courseTitle)[0].trim().slice(0, 500) || captured.text.slice(0, 500);
          const title = captured.dueSummary && visibleTitle.endsWith(captured.dueSummary) ? visibleTitle.slice(0, -captured.dueSummary.length).trim() : visibleTitle;
          records.push({ ...ids, title, instructions: "", metadataText: captured.dueSummary, pointsText: "", linkedFileNames: [], listSection, detailState: "not_assigned", cardText: captured.text, courseTitle: captured.courseTitle, dueSummary: captured.dueSummary, detailUrl: `${detailUrl.origin}${detailUrl.pathname}` });
          continue;
        }
        stage = `detail_read_${listSection}_${index}`;
        const detail = await frame.evaluate(String.raw`(() => {
          const text = selector => (document.querySelector(selector)?.innerText ?? "").replace(/\s+/g, " ").trim();
          // Teams renders assignment resources as buttons inside a resource
          // well, not anchors. Keep the anchor fallback for older layouts.
          const linkedFileNames = [...new Set([...document.querySelectorAll('[class*="assignment-details-files-container"] [class*="resource-well"] button[class*="open-button"], [class*="assignment-details-files-container"] a')]
            .map(element => (element.textContent ?? "").replace(/\s+/g, " ").trim())
            .filter(name => name.length > 0 && name.length <= 500))].slice(0, 100);
          return { title: text('[class*="assignment-title"]'), instructions: text('[class*="assignment-details-description"]'), metadataText: text('[class*="assignment-metadata-container"]'), pointsText: text('[class*="assignment-details-right-pane"]'), linkedFileNames };
        })()`) as { title: string; instructions: string; metadataText: string; pointsText: string; linkedFileNames: string[] };
        if (!detail.title || detail.title.length > 500 || detail.instructions.length > 100_000 || detail.metadataText.length > 8_000 || detail.pointsText.length > 8_000) throw new Error("teams_assignment_detail_invalid_or_unbounded");
        const detailUrl = new URL(frame.url());
        records.push({ ...ids, ...detail, listSection, detailState: "available", cardText: captured.text, courseTitle: captured.courseTitle, dueSummary: captured.dueSummary, detailUrl: `${detailUrl.origin}${detailUrl.pathname}` });
      }
    }
    if (!records.length) throw new Error("teams_assignment_list_empty");
    if (new Set(records.map(item => `${item.classExternalId}:${item.assignmentExternalId}`)).size !== records.length) throw new Error("teams_assignment_duplicate_identity");
    return { version: "omega_teams_assignments_json_v1", source_timestamp: new Date().toISOString(), source_origin: assignmentOrigin, coverage: { listRoute: parsedList.pathname, visibleCardCount: records.length, capturedDetailCount: records.length, complete: false, limitation: "Upcoming, Past due and Completed list cards were captured. Pagination, attachments, filters, and submission details have not been verified." }, records };
  } catch (caught) {
    if (caught instanceof Error && /^teams_[a-z0-9_]+$/.test(caught.message)) throw caught;
    throw new Error(`teams_assignment_${stage}_failed`);
  } finally { await probe.close(); }
}
