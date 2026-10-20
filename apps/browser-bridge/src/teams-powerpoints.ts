import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Download, Frame, Page } from "playwright-core";
import { openTeamsNavigation } from "./teams-navigation.js";

type Entry = { name: string; rowIndex: number; folder: boolean };
type ManifestItem = { relativePath: string; stagedName: string; sha256: string; byteLength: number; modifiedAt: string };

const maxClasses = 30;
const maxFolders = 1000;
const maxDepth = 10;
const maxFiles = 2048;
const maxFileBytes = 100 * 1024 * 1024;
const maxBatchBytes = 5 * 1024 * 1024 * 1024;
const supportedSchoolFile = /\.(?:pptx|pdf|docx|xlsx)$/i;

export function schoolFileByteLimit(name: string): number {
  if (!supportedSchoolFile.test(name)) throw new Error("teams_school_file_type_unsupported");
  return /\.pptx$/i.test(name) ? maxFileBytes : 25 * 1024 * 1024;
}

export function validateSchoolOriginal(name: string, contents: Uint8Array): void {
  if (contents.length < 4 || contents.length > schoolFileByteLimit(name)) throw new Error("teams_school_file_size_invalid");
  if (/\.pdf$/i.test(name)) {
    if (contents[0] !== 0x25 || contents[1] !== 0x50 || contents[2] !== 0x44 || contents[3] !== 0x46) throw new Error("teams_school_file_signature_invalid");
    return;
  }
  if (contents[0] !== 0x50 || contents[1] !== 0x4b) throw new Error("teams_school_file_signature_invalid");
  const marker = /\.pptx$/i.test(name) ? "ppt/presentation.xml" : /\.xlsx$/i.test(name) ? "xl/workbook.xml" : "word/document.xml";
  if (!Buffer.from(contents).includes(marker)) throw new Error("teams_school_file_signature_invalid");
}

export function safeSegment(value: string): string {
  const cleaned = value.normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  if (!cleaned || cleaned === "." || cleaned === "..") throw new Error("teams_file_path_segment_invalid");
  return cleaned.slice(0, 180);
}

export function postSchoolFileRelativePath(className: string, chainId: string, messageId: string, fileName: string, ordinal = 0, channelName = "General"): string {
  if (!chainId || !messageId || !Number.isInteger(ordinal) || ordinal < 0) throw new Error("teams_post_powerpoint_identity_invalid");
  const postId = createHash("sha256").update(`${className}:${chainId}:${messageId}`).digest("hex").slice(0, 24);
  const name = safeSegment(fileName);
  if (!supportedSchoolFile.test(name)) throw new Error("teams_post_school_file_name_invalid");
  return ["Teams", safeSegment(className), safeSegment(channelName), "Posts", postId, ordinal ? `${ordinal + 1}-${name}` : name].join("/");
}

export function assignmentSchoolFileRelativePath(courseTitle: string, classId: string, assignmentId: string, fileName: string, ordinal = 0): string {
  if (!classId || !assignmentId || classId.length > 200 || assignmentId.length > 200 || !Number.isInteger(ordinal) || ordinal < 0) throw new Error("teams_assignment_file_identity_invalid");
  const name = safeSegment(fileName);
  if (!supportedSchoolFile.test(name)) throw new Error("teams_assignment_school_file_name_invalid");
  const stableId = createHash("sha256").update(`${classId}:${assignmentId}`).digest("hex").slice(0, 24);
  return ["Teams", safeSegment(courseTitle), "Assignments", stableId, ordinal ? `${ordinal + 1}-${name}` : name].join("/");
}

const retryableDownloadErrors = new Set([
  "teams_powerpoint_download_invalid",
  "teams_powerpoint_download_event_timeout",
  "teams_powerpoint_download_path_timeout",
  "teams_powerpoint_download_path_failed",
  "teams_powerpoint_download_missing",
  "teams_powerpoint_download_empty",
  "teams_powerpoint_download_was_bundle",
  "teams_powerpoint_archive_invalid",
  "teams_school_file_signature_invalid",
  "teams_school_file_download_was_bundle",
]);

export async function retryInvalidDownload<T>(download: () => Promise<T>, wait: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))): Promise<T> {
  const delays = [500, 1_000, 2_000];
  for (let attempt = 0; ; attempt++) {
    try { return await download(); }
    catch (error) {
      if (!(error instanceof Error) || !retryableDownloadErrors.has(error.message) || attempt >= delays.length) throw error;
      await wait(delays[attempt]);
    }
  }
}

export function skippableSchoolFileError(error: unknown): string | null {
  return error instanceof Error && retryableDownloadErrors.has(error.message) ? error.message : null;
}

export async function readSchoolDownload(download: Pick<Download, "saveAs" | "suggestedFilename" | "cancel">, stagingRoot: string, fileName: string, bytesSoFar: number): Promise<Buffer> {
  const filePath = path.join(stagingRoot, "files", `${randomUUID()}.download`);
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const saving = download.saveAs(filePath);
    await Promise.race([saving, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("download_timeout")), 60_000); })])
      .catch(async error => {
        if (error instanceof Error && error.message === "download_timeout") {
          await download.cancel().catch(() => {});
          await saving.catch(() => {});
          throw new Error("teams_powerpoint_download_path_timeout");
        }
        throw new Error("teams_powerpoint_download_path_failed");
      })
      .finally(() => { if (timer) clearTimeout(timer); });
    const metadata = await stat(filePath).catch(() => { throw new Error("teams_powerpoint_download_missing"); });
    if (!metadata.isFile() || metadata.size < 1) throw new Error("teams_powerpoint_download_empty");
    if (!download.suggestedFilename().toLowerCase().endsWith(fileName.slice(fileName.lastIndexOf(".")).toLowerCase())) throw new Error("teams_school_file_download_was_bundle");
    if (metadata.size > schoolFileByteLimit(fileName)) throw new Error(`teams_powerpoint_file_limit_exceeded:${metadata.size}`);
    if (bytesSoFar + metadata.size > maxBatchBytes) throw new Error(`teams_powerpoint_batch_limit_exceeded:${bytesSoFar + metadata.size}`);
    const contents = await readFile(filePath).catch(() => { throw new Error("teams_powerpoint_download_invalid"); });
    validateSchoolOriginal(fileName, contents);
    return contents;
  } finally {
    await unlink(filePath).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; });
  }
}

async function visibleEntries(frame: Frame): Promise<{ entries: Entry[]; totalRows: number | null }> {
  const snapshot = await frame.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('[role="grid"]');
    const totalText = grid?.getAttribute("aria-rowcount") ?? "";
    const entries = [...document.querySelectorAll<HTMLElement>('[role="row"]')].flatMap((row, rowIndex) => {
      if (row.getAttribute("data-automationid") === "row-header") return [];
      const name = (row.querySelector('[data-automationid="field-LinkFilename"]')?.textContent ?? "").trim();
      const iconCell = row.querySelector<HTMLElement>('[data-automationid="field-DocIcon"]');
      const iconLabels = [...(iconCell?.querySelectorAll<HTMLElement>('[title], [aria-label]') ?? [])].map(icon => icon.getAttribute("title") ?? icon.getAttribute("aria-label") ?? "");
      return name ? [{ name, rowIndex, folder: iconLabels.some(label => /folder/i.test(label)) }] : [];
    });
    return { entries, totalRows: /^\d+$/.test(totalText) ? Number(totalText) : null };
  });
  if (snapshot.totalRows !== null && snapshot.totalRows > snapshot.entries.length + 1) throw new Error("teams_sharepoint_virtualized_rows_not_captured");
  if (snapshot.entries.length > 1000) throw new Error("teams_sharepoint_folder_too_large");
  return snapshot;
}

async function waitForGrid(frame: Frame, priorSignature?: string): Promise<void> {
  await frame.locator('[role="row"]').first().waitFor({ timeout: 20_000 });
  let previous = "", stable = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    const state = await frame.evaluate(() => ({
      rows: document.querySelectorAll('[role="row"]').length,
      signature: [...document.querySelectorAll<HTMLElement>('[role="row"]')].map(row => (row.querySelector('[data-automationid="field-LinkFilename"]')?.textContent ?? "").trim()).join("\0"),
      empty: /this folder is empty|no files|ingen filer|mappen er tom/i.test(document.body?.innerText ?? ""),
    }));
    const signature = `${state.rows}:${state.signature}`;
    stable = signature === previous ? stable + 1 : 0;
    previous = signature;
    if (stable >= 3 && (state.rows > 1 || state.empty) && (priorSignature === undefined || signature !== priorSignature)) return;
    await frame.waitForTimeout(500);
  }
  throw new Error("teams_sharepoint_grid_not_loaded");
}

async function enterFolder(frame: Frame, name: string): Promise<void> {
  // A double-click can leave the previous grid visible while SharePoint loads the
  // next folder. Do not treat those old rows as a changed or removed folder.
  for (let attempt = 0; attempt < 20; attempt++) {
    const entries = (await visibleEntries(frame)).entries;
    const matches = entries.filter(entry => entry.folder && entry.name === name);
    if (matches.length > 1) throw new Error("teams_sharepoint_folder_ambiguous");
    if (matches.length === 1) {
      const priorSignature = await frame.evaluate(() => `${document.querySelectorAll('[role="row"]').length}:${[...document.querySelectorAll<HTMLElement>('[role="row"]')].map(row => (row.querySelector('[data-automationid="field-LinkFilename"]')?.textContent ?? "").trim()).join("\0")}`);
      await frame.locator('[role="row"]').nth(matches[0].rowIndex).locator('[data-automationid="field-LinkFilename"]').dblclick();
      await waitForGrid(frame, priorSignature);
      return;
    }
    await frame.waitForTimeout(500);
  }
  throw new Error("teams_sharepoint_folder_changed");
}

async function goToFolder(frame: Frame, rootUrl: string, segments: string[]): Promise<void> {
  await frame.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForGrid(frame);
  for (const segment of segments) await enterFolder(frame, segment);
}

function sharePointFrame(page: Page): Frame {
  const frames = page.frames().filter(frame => { try { return new URL(frame.url()).hostname === "akershusfylke.sharepoint.com"; } catch { return false; } });
  if (frames.length !== 1) throw new Error("teams_sharepoint_frame_missing_or_ambiguous");
  return frames[0];
}

async function collectPostFiles(probe: Page, className: string, channelName: string, stagingRoot: string, items: ManifestItem[], bytesSoFar: number, seen: Set<string>): Promise<{ presentations: number; documents: number; bytes: number }> {
  const cardSelector = '[data-tid="file-attachment-grid"] [role="group"][aria-label]';
  const candidates = await probe.evaluate(selector => [...document.querySelectorAll<HTMLElement>(selector)].flatMap((card, cardIndex) => {
    if (!/\.(?:pptx|pdf|docx|xlsx)$/i.test(card.getAttribute("aria-label") ?? "")) return [];
    let ancestor = card.parentElement;
    let owners: HTMLElement[] = [];
    while (ancestor && owners.length === 0) {
      owners = [...ancestor.querySelectorAll<HTMLElement>('[data-reply-chain-id][data-mid]')];
      ancestor = ancestor.parentElement;
    }
    if (owners.length !== 1) throw new Error(`teams_post_powerpoint_owner_ambiguous_${cardIndex}_${owners.length}`);
    return [{ cardIndex, messageId: owners[0].getAttribute("data-mid") ?? "", chainId: owners[0].getAttribute("data-reply-chain-id") ?? "", name: card.getAttribute("aria-label") ?? "" }];
  }), cardSelector);
  if (candidates.length > 200) throw new Error("teams_post_school_file_count_unbounded");
  let bytes = 0, presentations = 0, documents = 0;
  const duplicates = new Map<string, number>();
  for (const candidate of candidates) {
    if (!candidate.messageId || !candidate.chainId || !supportedSchoolFile.test(candidate.name)) throw new Error("teams_post_school_file_identity_invalid");
    if (items.length >= maxFiles) throw new Error("teams_powerpoint_file_limit_exceeded");
    const fileName = safeSegment(candidate.name);
    const key = `${candidate.chainId}:${candidate.messageId}/${fileName}`;
    const ordinal = duplicates.get(key) ?? 0;
    duplicates.set(key, ordinal + 1);
    const relativePath = postSchoolFileRelativePath(className, candidate.chainId, candidate.messageId, fileName, ordinal, channelName);
    if (seen.has(relativePath)) continue;
    const downloaded = await retryInvalidDownload(async () => {
      const currentIndex = await probe.locator(cardSelector).evaluateAll((elements, identity) => elements.flatMap((element, index) => {
        if (element.getAttribute("aria-label") !== identity.name) return [];
        let ancestor = element.parentElement;
        let owners: Element[] = [];
        while (ancestor && owners.length === 0) {
          owners = [...ancestor.querySelectorAll('[data-reply-chain-id][data-mid]')];
          ancestor = ancestor.parentElement;
        }
        return owners.length === 1 && owners[0].getAttribute("data-mid") === identity.messageId && owners[0].getAttribute("data-reply-chain-id") === identity.chainId ? [index] : [];
      })[identity.ordinal] ?? -1, { name: candidate.name, messageId: candidate.messageId, chainId: candidate.chainId, ordinal });
      if (currentIndex < 0) throw new Error(`teams_post_powerpoint_card_changed_${candidate.cardIndex}`);
      const card = probe.locator(cardSelector).nth(currentIndex);
      await card.press("Shift+F10");
      const action = probe.getByRole("menuitem", { name: "Download", exact: true });
      if (await action.count() !== 1) throw new Error("teams_post_download_action_missing");
      const download = await Promise.all([probe.waitForEvent("download", { timeout: 30_000 }), action.click({ timeout: 10_000, noWaitAfter: true })]).then(([item]) => item);
      return readSchoolDownload(download, stagingRoot, fileName, bytesSoFar + bytes);
    });
    const sha256 = createHash("sha256").update(downloaded).digest("hex");
    const stagedPath = path.join(stagingRoot, "files", sha256);
    await writeFile(stagedPath, downloaded, { flag: "wx" }).catch(async error => {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (createHash("sha256").update(await readFile(stagedPath)).digest("hex") !== sha256) throw new Error("teams_powerpoint_staged_hash_mismatch");
    });
    items.push({ relativePath, stagedName: sha256, sha256, byteLength: downloaded.length, modifiedAt: new Date().toISOString() });
    seen.add(relativePath);
    bytes += downloaded.length;
    if (/\.pptx$/i.test(fileName)) presentations++; else documents++;
  }
  return { presentations, documents, bytes };
}

async function collectPostFilesAcrossHistory(probe: Page, className: string, channelName: string, stagingRoot: string, items: ManifestItem[], bytesSoFar: number): Promise<{ presentations: number; documents: number; bytes: number }> {
  const viewport = probe.locator('[data-tid="channel-pane-viewport"]');
  await viewport.waitFor({ state: "attached", timeout: 10_000 });
  if (await viewport.count() !== 1) throw new Error("teams_post_file_viewport_ambiguous");
  const seen = new Set<string>();
  let stableTop = 0, lastHeight = -1, lastCount = -1;
  let presentations = 0, documents = 0, bytes = 0;
  for (let step = 0; step < 30; step++) {
    const startingTop = await viewport.evaluate(element => element.scrollTop);
    const batch = await collectPostFiles(probe, className, channelName, stagingRoot, items, bytesSoFar + bytes, seen);
    presentations += batch.presentations;
    documents += batch.documents;
    bytes += batch.bytes;
    // Focusing a file card to open its menu may scroll the pane. Resume from
    // the position we were scanning, not from the last downloaded card.
    await viewport.evaluate((element, top) => { element.scrollTop = top; }, startingTop);
    const snapshot = await viewport.evaluate(element => ({ top: element.scrollTop, height: element.scrollHeight, client: element.clientHeight }));
    if (snapshot.top === 0 && snapshot.height === lastHeight && seen.size === lastCount) stableTop++;
    else stableTop = 0;
    if (stableTop >= 3) return { presentations, documents, bytes };
    lastHeight = snapshot.height;
    lastCount = seen.size;
    await viewport.evaluate(element => { element.scrollTop = Math.max(0, element.scrollTop - Math.floor(element.clientHeight * 0.8)); });
    await probe.waitForTimeout(snapshot.top === 0 ? 1_500 : 500);
  }
  throw new Error("teams_post_file_history_scroll_limit");
}

export async function collectTeamsPowerpoints(source: Page, stagingRoot: string, classIndexOnly?: number): Promise<{ manifest: { version: string; deviceKey: string; items: ManifestItem[] }; report: { classes: number; channels: number; folders: number; entries: number; folderCandidates: number; postPresentations: number; postDocuments: number; presentations: number; documents: number; bytes: number; skippedFiles: Array<{ sourcePosition: string; reason: string }>; classSummaries: { index: number; channels: number; folders: number; entries: number; postPresentations: number; postDocuments: number; presentations: number; documents: number }[]; coverageComplete: false; coverageLimitation: string } }> {
  let probe = await source.context().newPage();
  const items: ManifestItem[] = [];
  const classSummaries: { index: number; channels: number; folders: number; entries: number; postPresentations: number; postDocuments: number; presentations: number; documents: number }[] = [];
  const skippedFiles: Array<{ sourcePosition: string; reason: string }> = [];
  let totalBytes = 0, classCount = 0, folderCount = 0, processedClasses = 0, entriesObserved = 0, folderCandidates = 0, channelCount = 0, postPresentations = 0, postDocuments = 0, presentations = 0, documents = 0;
  let phase = "open", fileContext = "none";
  await mkdir(path.join(stagingRoot, "files"), { recursive: true });
  try {
    await probe.goto(source.url(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    await openTeamsNavigation(probe, "teams");
    let classes = probe.locator(".fui-AccordionItem").filter({ hasText: /Classes\s*\d+\s*teams/i });
    await classes.waitFor({ timeout: 20_000 });
    if (await classes.count() !== 1) throw new Error("teams_classes_accordion_ambiguous");
    let header = classes.locator(".fui-AccordionHeader__button");
    if (await header.getAttribute("aria-expanded") === "false") await header.click();
    let cards = classes.locator('[role="group"]');
    await cards.first().waitFor({ timeout: 15_000 });
    classCount = await cards.count();
    if (classCount < 1 || classCount > maxClasses) throw new Error("teams_class_count_unbounded");
    if (classIndexOnly !== undefined && (!Number.isInteger(classIndexOnly) || classIndexOnly < 0 || classIndexOnly >= classCount)) throw new Error("teams_class_index_invalid");
    for (let classIndex = 0; classIndex < classCount; classIndex++) {
      if (classIndexOnly !== undefined && classIndex !== classIndexOnly) continue;
      phase = "class";
      processedClasses++;
      const before = { channels: channelCount, folders: folderCount, entries: entriesObserved, postPresentations, postDocuments, presentations, documents };
      const className = safeSegment((await cards.nth(classIndex).textContent() ?? "").replace(/\s+/g, " ").trim());
      await cards.nth(classIndex).click();
      const general = probe.getByRole("treeitem", { name: /^(General|Generelt)$/ });
      await general.waitFor({ timeout: 15_000 });
      if (await general.count() !== 1) throw new Error("teams_general_channel_ambiguous");
      const hidden = probe.locator("#single-team-hidden-channels");
      if (await hidden.count() === 1 && await hidden.getAttribute("aria-expanded") === "false") await hidden.click();
      const channelNames = await probe.locator('[role="treeitem"][aria-level="2"]').allTextContents();
      const channels = channelNames.map(value => safeSegment(value.trim()));
      if (!channels.some(value => /^(General|Generelt)$/.test(value)) || channels.length > 100 || new Set(channels).size !== channels.length) throw new Error("teams_channel_list_ambiguous");
      for (const channelName of channels) {
        phase = "channel";
        channelCount++;
        const channelIndex = channelCount - before.channels - 1;
        const channel = probe.getByRole("treeitem", { name: channelName, exact: true });
        if (await channel.count() !== 1) throw new Error("teams_channel_changed");
        await channel.click();
        await probe.waitForTimeout(1_500);
        const shared = probe.getByRole("tab", { name: /^(Shared|Files|Filer)$/ });
        await shared.waitFor({ timeout: 15_000 });
        if (await shared.count() !== 1) throw new Error("teams_shared_tab_ambiguous");
        phase = "posts";
        fileContext = `class_${classIndex}_channel_${channelIndex}_posts`;
        const postChannelName = /^(General|Generelt)$/.test(channelName) ? "General" : channelName;
        const postFiles = await collectPostFilesAcrossHistory(probe, className, postChannelName, stagingRoot, items, totalBytes);
        postPresentations += postFiles.presentations;
        postDocuments += postFiles.documents;
        presentations += postFiles.presentations;
        documents += postFiles.documents;
        totalBytes += postFiles.bytes;
        phase = "channel";
        await shared.click();
        await probe.waitForTimeout(3_000);
        const frame = sharePointFrame(probe);
        const rootUrl = frame.url();
        const rootAddress = new URL(rootUrl);
        if (rootAddress.hostname !== "akershusfylke.sharepoint.com" || !rootAddress.pathname.endsWith("/filebrowser.aspx")) throw new Error("teams_sharepoint_root_url_invalid");
        await waitForGrid(frame);
        const folders: string[][] = [[]];
        const seen = new Set<string>();
        for (let next = 0; next < folders.length; next++) {
        phase = "folder";
        const segments = folders[next];
        const key = segments.join("\0");
        if (seen.has(key)) continue;
        seen.add(key);
        if (++folderCount > maxFolders) throw new Error("teams_sharepoint_folder_limit_exceeded");
        await goToFolder(frame, rootUrl, segments);
        const entries = (await visibleEntries(frame)).entries;
        entriesObserved += entries.length;
        for (const entry of entries) {
          if (entry.folder) {
            folderCandidates++;
            if (segments.length < maxDepth) folders.push([...segments, entry.name]);
            else throw new Error("teams_sharepoint_folder_depth_exceeded");
            continue;
          }
          if (!supportedSchoolFile.test(entry.name)) continue;
          if (items.length + skippedFiles.length >= maxFiles) throw new Error("teams_powerpoint_file_limit_exceeded");
          const relativePath = ["Teams", className, channelName, ...segments.map(safeSegment), safeSegment(entry.name)].join("/");
          fileContext = `class_${classIndex}_channel_${channelIndex}_file_${items.length + skippedFiles.length}`;
          // SharePoint can return a stale selection or an incomplete download once.
          // Re-entering the folder clears selection before the single bounded retry.
          let bytes: Buffer;
          try { bytes = await retryInvalidDownload(async () => {
            phase = "reset";
            await goToFolder(frame, rootUrl, segments);
            const currentEntries = (await visibleEntries(frame)).entries.filter(candidate => !candidate.folder && candidate.name === entry.name);
            if (currentEntries.length !== 1) throw new Error("teams_powerpoint_row_changed");
            const row = frame.locator('[role="row"]').nth(currentEntries[0].rowIndex);
            phase = "select";
            await row.click();
            phase = "download";
            const downloadButton = frame.getByRole("menuitem", { name: /^Download$/ });
            await downloadButton.waitFor({ timeout: 10_000 });
            const download = await Promise.all([probe.waitForEvent("download", { timeout: 30_000 }), downloadButton.click({ timeout: 10_000, noWaitAfter: true })]).then(([item]) => item).catch(error => {
              if (error instanceof Error && error.name === "TimeoutError") throw new Error("teams_powerpoint_download_event_timeout");
              throw error;
            });
            phase = "validate";
            return readSchoolDownload(download, stagingRoot, entry.name, totalBytes);
          }); } catch (error) {
            const reason = skippableSchoolFileError(error);
            if (!reason || skippedFiles.length >= 5) throw error;
            skippedFiles.push({ sourcePosition: fileContext, reason });
            continue;
          }
          const sha256 = createHash("sha256").update(bytes).digest("hex");
          const stagedPath = path.join(stagingRoot, "files", sha256);
          await writeFile(stagedPath, bytes, { flag: "wx" }).catch(async error => {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
            if (createHash("sha256").update(await readFile(stagedPath)).digest("hex") !== sha256) throw new Error("teams_powerpoint_staged_hash_mismatch");
          });
          items.push({ relativePath, stagedName: sha256, sha256, byteLength: bytes.length, modifiedAt: new Date().toISOString() });
          totalBytes += bytes.length;
          if (/\.pptx$/i.test(entry.name)) presentations++; else documents++;
        }
        }
      }
      classSummaries.push({ index: classIndex, channels: channelCount - before.channels, folders: folderCount - before.folders, entries: entriesObserved - before.entries, postPresentations: postPresentations - before.postPresentations, postDocuments: postDocuments - before.postDocuments, presentations: presentations - before.presentations, documents: documents - before.documents });
      // SharePoint can retain selection/download state in the page even after
      // a top-level navigation. Close that probe and use a genuinely new page
      // for the next class; the signed-in source tab remains untouched.
      if (classIndex < classCount - 1 && classIndexOnly === undefined) {
        phase = "class_reset";
        await probe.close();
        probe = await source.context().newPage();
        await probe.goto(source.url(), { waitUntil: "domcontentloaded", timeout: 30_000 });
        await openTeamsNavigation(probe, "teams");
        classes = probe.locator(".fui-AccordionItem").filter({ hasText: /Classes\s*\d+\s*teams/i });
        await classes.waitFor({ timeout: 20_000 });
        if (await classes.count() !== 1) throw new Error("teams_classes_accordion_ambiguous");
        header = classes.locator(".fui-AccordionHeader__button");
        if (await header.getAttribute("aria-expanded") === "false") await header.click();
        cards = classes.locator('[role="group"]');
        await cards.first().waitFor({ timeout: 15_000 });
        if (await cards.count() !== classCount) throw new Error("teams_class_count_changed_during_capture");
      }
    }
  } catch (error) {
    if (error instanceof Error && retryableDownloadErrors.has(error.message)) throw new Error(`${error.message}_${fileContext}`);
    if (error instanceof Error && /^teams_[a-z0-9_]+(?::\d+)?$/.test(error.message)) throw error;
    const kind = error instanceof Error && error.name === "TimeoutError" ? "timeout" : error instanceof TypeError ? "type_error" : "unexpected";
    throw new Error(`teams_powerpoint_${phase}_${kind}_${fileContext}`);
  } finally { await probe.close(); }
  return { manifest: { version: "omega_personal_files_v1", deviceKey: "teams-sharepoint", items }, report: { classes: processedClasses, channels: channelCount, folders: folderCount, entries: entriesObserved, folderCandidates, postPresentations, postDocuments, presentations, documents, bytes: totalBytes, skippedFiles, classSummaries, coverageComplete: false, coverageLimitation: `Visible and hidden class-channel Shared folders plus PPTX/PDF/DOCX/XLSX post attachments rendered while scrolling each channel to the top. ${skippedFiles.length} file(s) could not be downloaded and must be retried. Server-side history beyond the loaded feed, unloaded replies, Classwork, other file types, scanned PDFs, and image-only slides are not yet covered.` } };
}
