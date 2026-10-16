import { chromium } from "playwright-core";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// Development-only structural probe. Section table previews can include private
// record text; run locally only and never save its output to the public repo.
const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index], value = process.argv[index + 1];
  if (!key?.startsWith("--") || !value) throw new Error("usage: inspect-layout --cdp http://127.0.0.1:9222 --provider teams|inschool [--origin https://mailand.inschool.visma.no]");
  args.set(key.slice(2), value);
}
let endpointText = args.get("cdp");
if (args.get("cdp-profile") || args.get("cdp-brave") === "true") {
  const profile = args.get("cdp-profile") ?? path.join(process.env.LOCALAPPDATA ?? "", "BraveSoftware", "Brave-Browser", "User Data");
  if (!path.isAbsolute(profile) || endpointText) throw new Error("absolute_cdp_profile_without_endpoint_required");
  const [portText, socketPath] = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split(/\r?\n/);
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || !/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(socketPath ?? "")) throw new Error("cdp_profile_port_file_invalid");
  endpointText = `ws://127.0.0.1:${port}${socketPath}`;
}
const endpoint = new URL(endpointText ?? "");
if (!["http:", "ws:"].includes(endpoint.protocol) || !["127.0.0.1", "localhost"].includes(endpoint.hostname) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.protocol === "http:" && endpoint.pathname !== "/" || endpoint.protocol === "ws:" && !/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(endpoint.pathname)) throw new Error("local_cdp_endpoint_required");
const provider = args.get("provider");
if (provider !== "teams" && provider !== "inschool") throw new Error("provider_required");
const expectedOrigin = provider === "inschool" ? new URL(args.get("origin") ?? "").origin : null;
if (provider === "inschool" && (!expectedOrigin || !new URL(expectedOrigin).hostname.endsWith(".inschool.visma.no"))) throw new Error("inschool_origin_invalid");
const browser = await chromium.connectOverCDP(endpoint.toString()).catch(() => { throw new Error("cdp_connection_failed"); });
try {
  let page = browser.contexts().flatMap(context => context.pages()).find(candidate => {
    try { const origin = new URL(candidate.url()).origin; return provider === "teams" ? ["https://teams.microsoft.com", "https://teams.cloud.microsoft"].includes(origin) : origin === expectedOrigin; } catch { return false; }
  });
  let authProbed = false;
  if (!page && provider === "inschool" && args.get("probe-inschool-auth") === "true") {
    const probe = await browser.contexts()[0].newPage();
    try {
      await probe.goto(expectedOrigin!, { waitUntil: "domcontentloaded", timeout: 15_000 });
      const destination = new URL(probe.url());
      const auth = await probe.evaluate(() => ({
        passwordFields: document.querySelectorAll('input[type="password"]').length,
        timetableVisible: document.querySelectorAll(".userTimetable_currentWeek").length === 1,
      }));
      console.log(JSON.stringify({ provider, probe: { origin: destination.origin, routeShape: destination.pathname.replace(/\d+/g, "*"), ...auth } }));
    } finally { await probe.close(); }
    authProbed = true;
  }
  if (!authProbed) {
  if (!page) throw new Error("matching_tab_not_found");
  if (args.get("inschool-section") && provider === "inschool") {
    const section = args.get("inschool-section");
    if (!section || !["attendance", "attendance/lessons", "attendance/future", "assessment", "assessment/exams"].includes(section)) throw new Error("inschool_section_not_registered");
    const probe = await browser.contexts()[0].newPage();
    try {
      await probe.goto(`${expectedOrigin}/#/app/${section}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await probe.waitForTimeout(5_000);
      if (section === "assessment" && args.get("assessment-expand") === "true") {
        const more = probe.getByRole("button", { name: "Se mer", exact: true });
        if (await more.count() === 1) {
          await more.click();
          await probe.waitForTimeout(1_000);
        }
      }
      const structure = await probe.evaluate(() => {
        const clean = (value: string | null) => (value ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(token)).slice(0, 6);
        const candidates = [...document.querySelectorAll<HTMLElement>('main [class*="attendance" i], main [class*="assessment" i], main [class*="grade" i], main [class*="frav" i], main table, main [role="grid"], main [role="row"], main [role="tab"]')].slice(0, 100);
        return {
          routeShape: `${location.pathname}${location.hash}`,
          bodyCharacters: document.body?.innerText?.length ?? 0,
          counts: { tables: document.querySelectorAll("table").length, rows: document.querySelectorAll('tr, [role="row"]').length, tabs: document.querySelectorAll('[role="tab"]').length },
          tabs: [...document.querySelectorAll<HTMLElement>('[role="tab"]')].map(item => ({ label: (item.textContent ?? "").trim().slice(0, 60), selected: item.getAttribute("aria-selected"), hrefShape: item.getAttribute("href")?.replace(/\d+/g, "*") ?? null })),
          selectors: [...document.querySelectorAll<HTMLSelectElement>("main select")].map(item => ({ optionCount: item.options.length, selectedIndex: item.selectedIndex, options: [...item.options].slice(0, 30).map(option => ({ valueShape: option.value.replace(/\d+/g, "*"), label: (option.textContent ?? "").trim().slice(0, 40) })) })),
          emptyIndicators: { examHeading: /\beksamen\b/i.test(document.querySelector("main")?.innerText ?? ""), noResults: /ingen|ikke.*(eksamen|resultat)|no (exams|results)/i.test(document.querySelector("main")?.innerText ?? ""), cards: document.querySelectorAll("main article, main [class*='exam' i], main [class*='empty' i]").length },
          table: [...document.querySelectorAll<HTMLTableElement>("table")].map(item => ({
            reportedRows: item.getAttribute("aria-rowcount"),
            headerRows: item.querySelectorAll("thead tr").length,
            headers: [...item.querySelectorAll("thead th")].map(cell => (cell.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80)),
            rows: [...item.querySelectorAll("tbody tr")].slice(0, 3).map(row => [...row.querySelectorAll("td")].map(cell => ({ text: (cell.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120), classes: clean(cell.className), attributes: [...cell.attributes].map(attribute => attribute.name).filter(name => name !== "style").slice(0, 8) }))),
          })),
          pagingControls: [...document.querySelectorAll<HTMLElement>('main button, main select, main [role="combobox"]')].map(item => ({ tag: item.tagName.toLowerCase(), label: (item.getAttribute("aria-label") ?? item.getAttribute("title") ?? item.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80), disabled: item.hasAttribute("disabled"), classes: clean(item.className) })).filter(item => /page|side|neste|forrige|rad|row|vis|show|\b\d+\b/i.test(item.label)).slice(0, 30),
          headings: [...document.querySelectorAll<HTMLElement>("main h1, main h2, main h3")].slice(0, 15).map(item => ({ tag: item.tagName.toLowerCase(), text: (item.textContent ?? "").trim().slice(0, 60), classes: clean(item.className) })),
          candidates: candidates.map(item => ({ tag: item.tagName.toLowerCase(), role: item.getAttribute("role"), classes: clean(item.getAttribute("class")), attributes: [...item.attributes].map(attribute => attribute.name).filter(name => name !== "class" && name !== "style").slice(0, 8), childCount: item.children.length, textLength: (item.textContent ?? "").trim().length })),
        };
      });
      let detail: unknown = null;
      let allDetails: unknown = null;
      if (section === "assessment" && args.get("inspect-all-details") === "true") {
        const links = await probe.locator("table tbody tr a[href]").evaluateAll(elements => elements.map(element => element.getAttribute("href") ?? "").filter(value => /^#\/app\/assessment\/groups\/\d+\/details$/.test(value)));
        if (links.length < 1 || links.length > 50) throw new Error("inschool_assessment_links_unbounded");
        const summaries: Array<{ groupId: string; rowCount: number; gradeCount: number; headingCount: number }> = [];
        for (const href of links) {
          await probe.goto(`${expectedOrigin}/${href}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
          await probe.locator("main h1").waitFor({ timeout: 15_000 });
          const summary = await probe.evaluate(() => ({
            rowCount: document.querySelectorAll("main table tbody tr").length,
            gradeCount: [...document.querySelectorAll("main table tbody tr")].filter(row => { const cells = row.querySelectorAll("td"); const value = (cells[4]?.textContent ?? "").trim(); return Boolean(value && value !== "-"); }).length,
            headingCount: document.querySelectorAll("main h2, main h3").length,
          }));
          summaries.push({ groupId: /groups\/(\d+)/.exec(href)?.[1] ?? "unknown", ...summary });
        }
        allDetails = summaries;
        await probe.goto(`${expectedOrigin}/#/app/assessment`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await probe.locator("table tbody tr").first().waitFor({ timeout: 15_000 });
      }
      if (section === "attendance/lessons" && args.get("inspect-first-detail") === "true") {
        const action = probe.locator("table").first().locator("tbody tr").first().getByText("Se fravær");
        if (await action.count() === 1) {
          await action.click();
          await probe.waitForTimeout(1_000);
          detail = await probe.evaluate(() => ({
            dialogs: [...document.querySelectorAll<HTMLElement>('[role="dialog"], .modal, [class*="modal" i]')].slice(0, 8).map(element => ({ text: (element.innerText ?? "").trim().slice(0, 3_000), classes: element.className, tables: [...element.querySelectorAll("table")].map(table => ({ headers: [...table.querySelectorAll("th")].map(cell => cell.textContent?.trim()), rows: [...table.querySelectorAll("tbody tr")].slice(0, 8).map(row => [...row.querySelectorAll("td")].map(cell => cell.textContent?.trim())) })) })),
            routeShape: `${location.pathname}${location.hash}`,
          }));
        }
      } else if (section === "assessment" && args.get("inspect-first-detail") === "true") {
        const selectedIndex = Number(args.get("assessment-group-index") ?? "0");
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 49) throw new Error("inschool_assessment_group_index_invalid");
        const first = probe.locator("table tbody tr").nth(selectedIndex);
        if (await first.count() === 1) {
          const link = first.getByRole("link").first();
          if (await link.count() === 1) await link.click();
          else await first.click();
          await probe.waitForTimeout(1_000);
          detail = await probe.evaluate(() => ({
            routeShape: `${location.pathname}${location.hash}`,
            bodyCharacters: document.body?.innerText?.length ?? 0,
            headings: [...document.querySelectorAll<HTMLElement>("main h1, main h2, main h3")].map(element => (element.textContent ?? "").trim().slice(0, 70)).slice(0, 15),
            tables: [...document.querySelectorAll("main table")].map(table => ({ headers: [...table.querySelectorAll("thead th")].map(cell => (cell.textContent ?? "").trim().slice(0, 70)), rows: table.querySelectorAll("tbody tr").length, sample: [...table.querySelectorAll("tbody tr")].slice(0, 3).map(row => [...row.querySelectorAll("td")].map(cell => (cell.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 150))) })),
            actionLabels: [...document.querySelectorAll<HTMLElement>("main button, main a")].map(element => (element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 25),
          }));
          if (args.get("inspect-assessment-item") === "true") {
            const candidateRows = probe.locator("main table tbody tr");
            const gradedIndex = args.get("assessment-graded-item") === "true" ? await candidateRows.evaluateAll(rows => rows.findIndex(row => { const value = (row.querySelectorAll("td")[4]?.textContent ?? "").trim(); return Boolean(value && value !== "-"); })) : -1;
            const item = (gradedIndex >= 0 ? candidateRows.nth(gradedIndex) : candidateRows.last()).getByText("Se detaljer", { exact: true });
            if (await item.count() === 1) {
              await item.click();
              await probe.waitForTimeout(500);
              (detail as Record<string, unknown>).item = await probe.evaluate(() => ({
                routeShape: `${location.pathname}${location.hash}`,
                dialogs: [...document.querySelectorAll<HTMLElement>('[role="dialog"], .VsModal, [class*="modal" i]')].slice(0, 4).map(element => ({ classes: element.className, text: (element.innerText ?? "").trim().slice(0, 2500) })),
                linkShapes: [...document.querySelectorAll<HTMLAnchorElement>('[role="dialog"] a[href], .VsModal a[href]')].slice(0, 30).map(anchor => { const url = new URL(anchor.href, location.href); return { host: url.hostname, pathShape: url.pathname.replace(/\d+/g, "*").slice(0, 120), hashPresent: Boolean(url.hash), queryPresent: Boolean(url.search) }; }),
                iframeCount: document.querySelectorAll('[role="dialog"] iframe, .VsModal iframe').length,
                headings: [...document.querySelectorAll<HTMLElement>("main h1, main h2, main h3")].map(element => (element.textContent ?? "").trim()).slice(0, 12),
              }));
            }
          }
        }
      }
      console.log(JSON.stringify({ provider, section, structure, detail, allDetails }));
    } finally { await probe.close(); }
  } else if (args.get("teams-first-class-open") === "true" && provider === "teams") {
    const probe = await browser.contexts()[0].newPage();
    try {
      await probe.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 30_000 });
      const teamsNavigation = probe.getByRole("button", { name: /^Teams \(Ctrl\+Shift\+5\)$/ });
      await teamsNavigation.waitFor({ timeout: 20_000 });
      if (await teamsNavigation.count() !== 1) throw new Error("teams_navigation_ambiguous");
      await teamsNavigation.click();
      const classes = probe.locator(".fui-AccordionItem").filter({ hasText: /Classes\s*\d+\s*teams/i });
      await classes.waitFor({ timeout: 20_000 }).catch(async () => {
        const state = await probe.evaluate(String.raw`(() => ({ routeShape: location.pathname + location.hash, classesHeaders: [...document.querySelectorAll('.fui-AccordionItem button')].map(node => (node.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(text => /^Classes/i.test(text)).slice(0, 10), navigationLabels: [...document.querySelectorAll('button')].map(node => node.getAttribute('aria-label') ?? '').filter(text => /Teams|Classes/i.test(text)).slice(0, 10) }))()`);
        console.log(JSON.stringify({ provider, probeState: state }));
        throw new Error("teams_classes_accordion_not_loaded");
      });
      if (await classes.count() !== 1) throw new Error("teams_classes_accordion_ambiguous");
      const header = classes.locator(".fui-AccordionHeader__button");
      if (await header.count() !== 1) throw new Error("teams_classes_header_ambiguous");
      if (await header.getAttribute("aria-expanded") === "false") await header.click();
      const cards = classes.locator('[role="group"]');
      await cards.first().waitFor({ timeout: 15_000 });
      const count = await cards.count();
      if (count < 1 || count > 30) throw new Error("teams_class_card_count_unbounded");
      const classIndexText = args.get("class-index") ?? "0";
      if (!/^\d{1,2}$/.test(classIndexText) || Number(classIndexText) >= count) throw new Error("teams_class_index_invalid");
      const classIndex = Number(classIndexText);
      const classCategories = [];
      for (let index = 0; index < count; index++) {
        const label = await cards.nth(index).textContent() ?? "";
        classCategories.push({ math: /matematikk|math/i.test(label), history: /historie|history/i.test(label), economics: /økonomi|economics/i.test(label) });
      }
      await cards.nth(classIndex).click();
      await probe.waitForTimeout(5_000);
      if (args.get("teams-post-expand-probe") === "true") {
        const matches = probe.getByText("see more", { exact: true });
        const count = await matches.count();
        const visible = probe.locator("button:visible").filter({ hasText: /^see more$/i });
        const visibleCount = await visible.count();
        if (count < 1 || count > 100 || visibleCount > 100) throw new Error("teams_post_expand_count_unexpected");
        if (visibleCount === 0) {
          const hiddenShape = await matches.first().evaluate(item => {
            const post = item.closest<HTMLElement>('[data-reply-chain-id][data-mid]');
            const style = getComputedStyle(item);
            return { withinPost: Boolean(post), postTextLength: (post?.innerText ?? "").length, display: style.display, visibility: style.visibility, rectangleCount: item.getClientRects().length, parentDisplay: item.parentElement ? getComputedStyle(item.parentElement).display : null };
          });
          console.log(JSON.stringify({ provider, classIndex, postExpand: { count, visibleCount, hiddenShape } }));
        }
        else {
        const before = await visible.first().evaluate(item => {
          const post = item.closest<HTMLElement>('[data-reply-chain-id][data-mid]');
          return { tag: item.tagName.toLowerCase(), role: item.getAttribute("role"), tid: item.getAttribute("data-tid"), withinPost: Boolean(post), textLength: (post?.innerText ?? "").length, messageId: post?.getAttribute("data-mid") ?? null };
        });
        await visible.first().click();
        await probe.waitForTimeout(500);
        const after = await probe.evaluate(identity => {
          const post = [...document.querySelectorAll<HTMLElement>('[data-reply-chain-id][data-mid]')].find(item => item.getAttribute("data-mid") === identity.messageId);
          return { postCount: document.querySelectorAll('[data-reply-chain-id][data-mid]').length, textLength: (post?.innerText ?? "").length };
        }, before);
        console.log(JSON.stringify({ provider, classIndex, postExpand: { count, visibleCount, before: { tag: before.tag, role: before.role, tid: before.tid, withinPost: before.withinPost, textLength: before.textLength }, after } }));
        }
      } else if (args.get("teams-post-replies-probe") === "true") {
        const replyShape = await probe.evaluate(() => {
          const posts = [...document.querySelectorAll<HTMLElement>('[data-reply-chain-id][data-mid]')];
          const labels = (post: HTMLElement) => [...(post.closest<HTMLElement>('[role="group"]') ?? post).querySelectorAll<HTMLElement>('button, [role="button"], [role="link"]')]
            .map(item => ({ tag: item.tagName.toLowerCase(), role: item.getAttribute('role'), tid: item.getAttribute('data-tid'), label: (item.getAttribute('aria-label') ?? item.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) }))
            .filter(item => /repl|svar|comment|kommentar|thread|tråd/i.test(`${item.label} ${item.tid ?? ''}`)).slice(0, 12);
          const replyControls = [...document.querySelectorAll<HTMLElement>('button, [role="button"]')].filter(item => /repl|svar|comment|kommentar|thread|tråd/i.test(`${item.getAttribute('aria-label') ?? ''} ${item.getAttribute('data-tid') ?? ''}`));
          const chains = new Map<string, number>();
          for (const post of posts) { const chain = post.getAttribute('data-reply-chain-id') ?? ''; chains.set(chain, (chains.get(chain) ?? 0) + 1); }
          return { postCount: posts.length, chainCount: chains.size, chainSizeHistogram: [...chains.values()].reduce<Record<string, number>>((counts, size) => { counts[String(size)] = (counts[String(size)] ?? 0) + 1; return counts; }, {}), samples: posts.slice(0, 10).map(post => ({ controls: labels(post), nestedPosts: post.closest<HTMLElement>('[role="group"]')?.querySelectorAll('[data-reply-chain-id][data-mid]').length ?? 0, ancestorTids: (() => { const tids: string[] = []; for (let parent = post.parentElement; parent && tids.length < 8; parent = parent.parentElement) { const tid = parent.getAttribute('data-tid'); if (tid) tids.push(tid); } return tids; })() })), globalReplyControls: replyControls.length, replyControlShapes: replyControls.slice(0, 10).map(item => ({ tag: item.tagName.toLowerCase(), role: item.getAttribute('role'), tid: item.getAttribute('data-tid'), aria: item.getAttribute('aria-label'), textLength: (item.innerText ?? '').trim().length, visible: item.getClientRects().length > 0, ancestorTids: (() => { const tids: string[] = []; for (let parent = item.parentElement; parent && tids.length < 8; parent = parent.parentElement) { const tid = parent.getAttribute('data-tid'); if (tid) tids.push(tid); } return tids; })() })) };
        });
        console.log(JSON.stringify({ provider, classIndex, replyShape }));
      } else if (args.get("teams-post-history-probe") === "true") {
        const shape = await probe.evaluate(() => {
          const post = document.querySelector<HTMLElement>('[data-reply-chain-id][data-mid]');
          const ancestors = [];
          for (let item: HTMLElement | null = post; item && ancestors.length < 30; item = item.parentElement) {
            const style = getComputedStyle(item);
            ancestors.push({ tag: item.tagName.toLowerCase(), role: item.getAttribute("role"), tid: item.getAttribute("data-tid"), scrollHeight: item.scrollHeight, clientHeight: item.clientHeight, scrollTop: item.scrollTop, overflowY: style.overflowY, classes: [...item.classList].slice(0, 4) });
          }
          const historyControls = [...document.querySelectorAll<HTMLElement>('[data-tid="message-pane-body"] button, [data-tid="channel-pane-viewport"] button, [data-tid="message-pane-body"] a')]
            .map(item => (item.getAttribute("aria-label") ?? item.getAttribute("title") ?? item.textContent ?? "").replace(/\s+/g, " ").trim())
            .filter(label => /load|older|more|previous|earlier|tidligere|eldre|vis flere|last inn/i.test(label)).slice(0, 25);
          return { postCount: document.querySelectorAll('[data-reply-chain-id][data-mid]').length, ancestors, historyControls };
        });
        if (args.get("teams-post-history-scroll") === "true") {
          const seen = new Set<string>();
          const steps = [];
          const viewport = probe.locator('[data-tid="channel-pane-viewport"]');
          if (await viewport.count() !== 1) throw new Error("teams_post_viewport_ambiguous");
          for (let step = 0; step < 15; step++) {
            const snapshot = await viewport.evaluate(element => ({
              top: element.scrollTop,
              height: element.scrollHeight,
              client: element.clientHeight,
              ids: [...document.querySelectorAll<HTMLElement>('[data-reply-chain-id][data-mid]')].map(item => `${item.getAttribute("data-reply-chain-id")}:${item.getAttribute("data-mid")}`),
            }));
            snapshot.ids.forEach(id => seen.add(id));
            steps.push({ top: snapshot.top, height: snapshot.height, client: snapshot.client, rendered: snapshot.ids.length, distinctSeen: seen.size });
            if (step > 2 && snapshot.top === 0 && steps[step - 1].top === 0 && steps[step - 1].height === snapshot.height) break;
            await viewport.evaluate(element => { element.scrollTop = Math.max(0, element.scrollTop - Math.floor(element.clientHeight * 0.8)); });
            await probe.waitForTimeout(1_000);
          }
          console.log(JSON.stringify({ provider, classIndex, postHistoryScroll: steps }));
        } else console.log(JSON.stringify({ provider, classIndex, postHistoryShape: shape }));
      } else if (args.get("teams-channel-counts-probe") === "true") {
        const hidden = probe.locator("#single-team-hidden-channels");
        if (await hidden.count() === 1 && await hidden.getAttribute("aria-expanded") === "false") await hidden.click();
        const channels = (await probe.locator('[role="treeitem"][aria-level="2"]').allTextContents()).map(value => value.trim());
        if (channels.length < 1 || channels.length > 100 || new Set(channels).size !== channels.length) throw new Error("teams_channel_list_ambiguous");
        const counts = [];
        for (const name of channels) {
          const channel = probe.getByRole("treeitem", { name, exact: true });
          if (await channel.count() !== 1) {
            console.log(JSON.stringify({ provider, classIndex, channelCountsPartial: counts }));
            throw new Error("teams_channel_changed");
          }
          await channel.click();
          await probe.waitForTimeout(1_500);
          const selection = await probe.evaluate(name => {
            const item = [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')].find(element => (element.textContent ?? "").trim() === name);
            return { selected: item?.getAttribute("aria-selected") ?? null, current: item?.getAttribute("aria-current") ?? null };
          }, name);
          counts.push({
            channelIndex: counts.length,
            ...selection,
            postCount: await probe.locator('[data-reply-chain-id][data-mid]').count(),
            viewportCount: await probe.locator('[data-tid="channel-pane-viewport"]').count(),
            emptyIndicator: await probe.evaluate(() => /no posts|no conversations|start a post|ingen innlegg|ingen samtaler/i.test(document.body?.innerText ?? "")),
            errorIndicator: await probe.evaluate(() => /something went wrong|\boops\b/i.test(document.body?.innerText ?? "")),
            routeShape: new URL(probe.url()).pathname.replace(/[a-f0-9-]{20,}/gi, "*").slice(0, 100),
          });
          console.log(JSON.stringify({ provider, classIndex, channelStep: counts[counts.length - 1] }));
        }
        console.log(JSON.stringify({ provider, classIndex, channelCounts: counts }));
      } else if (args.get("teams-post-attachment-probe") === "true") {
        const posts = await probe.evaluate(() => {
          const extension = (value: string) => /\.(pptx|ppt|pdf|docx|xlsx|jpg|png)\b/i.exec(value)?.[1]?.toLowerCase() ?? null;
          return [...document.querySelectorAll<HTMLElement>('[data-reply-chain-id][data-mid]')].slice(0, 200).map(post => {
            const group = post.closest<HTMLElement>('[role="group"]') ?? post;
            const candidates = [...group.querySelectorAll<HTMLElement>('a[href], [role="link"], [data-tid*="file" i], [data-tid*="attach" i]')];
            return { elements: candidates.length, extensions: candidates.map(item => extension(`${item.getAttribute("aria-label") ?? ""} ${item.getAttribute("title") ?? ""} ${item.textContent ?? ""}`)).filter(Boolean), shapes: candidates.slice(0, 8).map(item => ({ tag: item.tagName.toLowerCase(), role: item.getAttribute("role"), tid: item.getAttribute("data-tid"), hasHref: Boolean(item.getAttribute("href")), hrefOrigin: (() => { try { return new URL(item.getAttribute("href") ?? "", location.href).origin; } catch { return null; } })(), textLength: (item.textContent ?? "").trim().length })) };
          });
        });
        const pptxGrid = await probe.evaluate(() => {
          const grid = [...document.querySelectorAll<HTMLElement>('[data-tid="file-attachment-grid"]')].find(item => /\.pptx\b/i.test(item.textContent ?? ""));
          const shape = (item: Element, depth: number): unknown => ({ tag: item.tagName.toLowerCase(), role: item.getAttribute("role"), tid: item.getAttribute("data-tid"), aria: item.getAttribute("aria-label"), title: item.getAttribute("title"), attributes: [...item.attributes].map(attribute => attribute.name).filter(name => name !== "class" && name !== "style").slice(0, 12), extension: /\.(pptx|ppt|pdf|docx|xlsx)\b/i.exec(item.textContent ?? "")?.[1]?.toLowerCase() ?? null, children: depth < 7 ? [...item.children].slice(0, 8).map(child => shape(child, depth + 1)) : [] });
          const raw = grid?.querySelector('[atpsharepointdata]')?.getAttribute("atpsharepointdata") ?? "";
          let metadata: unknown = null;
          try {
            const parsed: unknown = JSON.parse(raw);
            metadata = parsed && typeof parsed === "object" ? Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, typeof value === "string" ? { type: "string", length: value.length, looksLikeUrl: /^https?:\/\//i.test(value) } : { type: typeof value }])) : { type: typeof parsed };
          } catch { metadata = { parseable: false, length: raw.length, prefix: raw.slice(0, 1) }; }
          return grid ? { tree: shape(grid, 0), metadata } : null;
        });
        const postOwnership = await probe.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-tid="file-attachment-grid"] [role="group"][aria-label$=".pptx"]')].map(card => {
          const ancestry: { depth: number; postCount: number; directPostCount: number; group: boolean; grid: boolean }[] = [];
          let current: HTMLElement | null = card;
          for (let depth = 0; current && depth < 12; depth++, current = current.parentElement) {
            const posts = [...current.querySelectorAll<HTMLElement>('[data-reply-chain-id][data-mid]')];
            ancestry.push({ depth, postCount: posts.length, directPostCount: [...current.children].filter(child => child.matches('[data-reply-chain-id][data-mid]')).length, group: current.getAttribute('role') === 'group', grid: current.getAttribute('data-tid') === 'file-attachment-grid' });
          }
          return { ancestry };
        }));
        let opened: unknown = null;
        if (args.get("teams-post-open-pptx") === "true") {
          const card = probe.locator('[data-tid="file-attachment-grid"] [role="group"][aria-label$=".pptx"]');
          const cardCount = await card.count();
          if (cardCount < 1 || cardCount > 10) throw new Error(`teams_post_pptx_card_ambiguous:${cardCount}`);
          const before = new Set(browser.contexts()[0].pages());
          await card.first().press("Shift+F10");
          await probe.waitForTimeout(5_000);
          let downloadProbe: unknown = null;
          if (args.get("teams-post-download-probe") === "true") {
            const action = probe.getByRole("menuitem", { name: "Download", exact: true });
            if (await action.count() !== 1) throw new Error("teams_post_download_action_ambiguous");
            const download = await Promise.all([probe.waitForEvent("download", { timeout: 30_000 }), action.click({ timeout: 10_000, noWaitAfter: true })]).then(([item]) => item);
            let timeout: ReturnType<typeof setTimeout> | undefined;
            const filePath = await Promise.race([download.path(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("teams_post_download_timeout")), 60_000); })]).finally(() => { if (timeout) clearTimeout(timeout); });
            const bytes = await readFile(filePath);
            downloadProbe = { extension: path.extname(download.suggestedFilename()).toLowerCase(), bytes: bytes.length, magicZip: bytes[0] === 0x50 && bytes[1] === 0x4b, hasPresentation: bytes.includes("ppt/presentation.xml") };
          }
          const openedPages = browser.contexts()[0].pages().filter(page => page === probe || !before.has(page));
          opened = await Promise.all(openedPages.map(async page => ({
            origin: (() => { try { return new URL(page.url()).origin; } catch { return "unknown"; } })(),
            routeShape: (() => { try { return new URL(page.url()).pathname.replace(/[a-f0-9-]{20,}/gi, "*").slice(0, 120); } catch { return "unknown"; } })(),
            controls: await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, a, [role="button"], [role="menuitem"]')].map(item => ({ role: item.getAttribute("role"), label: (item.getAttribute("aria-label") ?? item.getAttribute("title") ?? item.textContent ?? "").trim().slice(0, 60) })).filter(item => item.role === "menuitem" || /download|save|open|share|last ned|åpne|lagre/i.test(item.label)).slice(0, 30)).catch(() => []),
          })));
          for (const page of openedPages) if (page !== probe) await page.close();
          opened = { pages: opened, downloadProbe };
        }
        console.log(JSON.stringify({ provider, classIndex, postAttachmentShape: { posts: posts.length, withCandidates: posts.filter(post => post.elements > 0).length, candidates: posts.reduce((total, post) => total + post.elements, 0), extensions: posts.flatMap(post => post.extensions), samples: posts.filter(post => post.elements > 0).slice(0, 12).map(post => post.shapes), pptxGrid, postOwnership, opened } }));
      } else if (args.get("teams-classwork-probe") === "true") {
        const classwork = probe.getByText("Classwork", { exact: true });
        const matches = await classwork.count();
        if (matches !== 1) throw new Error("teams_classwork_entry_ambiguous");
        await classwork.click();
        await probe.waitForTimeout(5_000);
        const shape = await probe.evaluate(() => ({
          tabs: [...document.querySelectorAll<HTMLElement>('[role="tab"]')].map(item => ({ label: (item.getAttribute("aria-label") ?? item.textContent ?? "").trim().slice(0, 40), selected: item.getAttribute("aria-selected") })),
          headings: [...document.querySelectorAll<HTMLElement>("h1, h2, h3")].map(item => ({ tag: item.tagName.toLowerCase(), text: (item.textContent ?? "").trim().slice(0, 200) })).slice(0, 20),
          counts: { pptxMentions: (document.body?.innerText?.match(/\.pptx\b/gi) ?? []).length, links: document.querySelectorAll("a[href]").length, iframes: document.querySelectorAll("iframe").length, dialogs: document.querySelectorAll('[role="dialog"]').length },
          controls: [...document.querySelectorAll<HTMLElement>('button, a, [role="button"], [role="tab"]')].slice(0, 80).map(item => ({ tag: item.tagName.toLowerCase(), role: item.getAttribute("role"), label: (item.getAttribute("aria-label") ?? item.getAttribute("title") ?? item.textContent ?? "").trim().slice(0, 80) })).filter(item => /classwork|material|assignment|module|resource|file|folder|show|open|view|oppgave|materiell/i.test(item.label)).slice(0, 30),
          frames: [...document.querySelectorAll<HTMLIFrameElement>("iframe")].map(item => { try { return new URL(item.src).origin; } catch { return "unknown"; } }).slice(0, 10),
        }));
        const classworkFrame = probe.frames().find(frame => { try { return new URL(frame.url()).hostname === "assignments.edu.cloud.microsoft"; } catch { return false; } });
        const embedded = classworkFrame ? await classworkFrame.evaluate(() => ({
          routeShape: `${location.pathname}${location.hash}`.replace(/[a-f0-9-]{20,}/gi, "*").slice(0, 150),
          bodyCharacters: document.body?.innerText?.length ?? 0,
          counts: { links: document.querySelectorAll("a[href]").length, rows: document.querySelectorAll('tr, [role="row"]').length, cards: document.querySelectorAll('article, [role="article"]').length, pptxMentions: (document.body?.innerText?.match(/\.pptx\b/gi) ?? []).length },
          headings: [...document.querySelectorAll<HTMLElement>("h1, h2, h3")].map(item => ({ tag: item.tagName.toLowerCase(), text: (item.textContent ?? "").trim().slice(0, 200) })).slice(0, 20),
          controls: [...document.querySelectorAll<HTMLElement>('button, a, [role="button"], [role="tab"]')].slice(0, 100).map(item => ({ tag: item.tagName.toLowerCase(), role: item.getAttribute("role"), label: (item.getAttribute("aria-label") ?? item.getAttribute("title") ?? item.textContent ?? "").trim().slice(0, 60) })).filter(item => /material|assignment|resource|file|folder|show|open|view|oppgave|materiell/i.test(item.label)).slice(0, 30),
        })) : null;
        console.log(JSON.stringify({ provider, classIndex, classwork: shape, embedded }));
      } else if (args.get("teams-class-files-probe") === "true") {
        const first = await probe.evaluate(() => {
          const matches = [...document.querySelectorAll<HTMLElement>('button, a, [role="button"], [role="tab"]')]
            .filter(element => /^(general|generelt|files|filer)$/i.test((element.getAttribute("aria-label") ?? element.textContent ?? "").trim()));
          return matches.slice(0, 12).map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute("role"), label: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim(), classes: (element.getAttribute("class") ?? "").split(/\s+/).slice(0, 5), parentRole: element.parentElement?.getAttribute("role") ?? null, parentClasses: (element.parentElement?.getAttribute("class") ?? "").split(/\s+/).slice(0, 5) }));
        });
        const general = probe.getByRole("treeitem", { name: /^(General|Generelt)$/ });
        const generalCount = await general.count();
        if (generalCount === 1) {
          await general.click();
          await probe.waitForTimeout(5_000);
        }
        const shared = probe.getByRole("tab", { name: /^(Shared|Files|Filer)$/ });
        const sharedCount = await shared.count();
        if (sharedCount === 1) {
          await shared.click();
          await probe.waitForTimeout(5_000);
        }
        if (args.get("teams-shared-download-probe") === "true") {
          const sharepoint = probe.frames().find(frame => { try { return new URL(frame.url()).hostname.endsWith(".sharepoint.com"); } catch { return false; } });
          if (!sharepoint) throw new Error("teams_sharepoint_frame_missing");
          const rows = sharepoint.locator('[role="row"]');
          await rows.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
          const fileIndexes = await rows.evaluateAll(elements => elements.flatMap((row, index) => /\.jpg\b/i.test(row.querySelector('[data-automationid="field-LinkFilename"]')?.textContent ?? "") ? [index] : []));
          if (fileIndexes.length !== 1) {
            const state = await sharepoint.evaluate(() => ({ rows: document.querySelectorAll('[role="row"]').length, extensions: [...document.querySelectorAll<HTMLElement>('[role="row"]')].map(row => /\.([a-z0-9]{2,5})\b/i.exec(row.querySelector('[data-automationid="field-LinkFilename"]')?.textContent ?? "")?.[1] ?? "none") }));
            throw new Error(`teams_download_probe_sample_ambiguous:${JSON.stringify(state)}`);
          }
          await rows.nth(fileIndexes[0]).click();
          const downloadButton = sharepoint.getByRole("menuitem", { name: /^Download$/ });
          await downloadButton.waitFor({ timeout: 10_000 });
          const download = await Promise.all([probe.waitForEvent("download", { timeout: 20_000 }), downloadButton.click()]).then(([item]) => item);
          const filepath = await download.path();
          const bytes = (await stat(filepath)).size;
          console.log(JSON.stringify({ provider, classIndex, downloadProbe: { extension: path.extname(download.suggestedFilename()).toLowerCase(), bytes } }));
        } else if (args.get("teams-shared-folder-probe") === "true") {
          const sharepoint = probe.frames().find(frame => { try { return new URL(frame.url()).hostname.endsWith(".sharepoint.com"); } catch { return false; } });
          if (!sharepoint) throw new Error("teams_sharepoint_frame_missing");
          const folderPath = (args.get("folder-path") ?? "0").split(",").map(part => Number(part));
          if (folderPath.length > 5 || folderPath.some(part => !Number.isInteger(part) || part < 0 || part > 19)) throw new Error("teams_folder_path_invalid");
          const folderCounts: number[] = [];
          for (const selectedIndex of folderPath) {
            const folders = sharepoint.locator('[role="row"]').filter({ has: sharepoint.locator('[title$="folder" i], [aria-label$="folder" i]') });
            const folderCount = await folders.count();
            folderCounts.push(folderCount);
            if (folderCount < 1 || folderCount > 20 || selectedIndex >= folderCount) break;
            await folders.nth(selectedIndex).locator('[data-automationid="field-LinkFilename"]').dblclick();
            await probe.waitForTimeout(5_000);
            await sharepoint.locator('[role="row"]').first().waitFor({ timeout: 20_000 }).catch(() => undefined);
          }
          const folderShape = await sharepoint.evaluate(() => ({
            bodyLength: document.body?.innerText?.length ?? 0,
            rows: document.querySelectorAll('[role="row"]').length,
            pptxRows: [...document.querySelectorAll<HTMLElement>('[role="row"]')].filter(row => /\.pptx\b/i.test(row.textContent ?? "")).length,
            folderRows: document.querySelectorAll('[role="row"] [title$="folder" i], [role="row"] [aria-label$="folder" i]').length,
            extensions: [...document.querySelectorAll<HTMLElement>('[role="row"]')].map(row => (/\.([a-z0-9]{2,5})\b/i.exec(row.querySelector('[data-automationid="field-LinkFilename"]')?.textContent ?? "")?.[1] ?? "none").toLowerCase()).reduce<Record<string, number>>((all, extension) => { all[extension] = (all[extension] ?? 0) + 1; return all; }, {}),
            rowIcons: [...document.querySelectorAll<HTMLElement>('[role="row"]')].slice(0, 20).map(row => ({ icon: [...row.querySelectorAll<HTMLElement>('[data-automationid="field-DocIcon"] [title], [data-automationid="field-DocIcon"] [aria-label]')].map(icon => icon.getAttribute("title") ?? icon.getAttribute("aria-label")).filter(Boolean).slice(0, 2), nameLength: (row.querySelector('[data-automationid="field-LinkFilename"]')?.textContent ?? "").trim().length })),
          }));
          console.log(JSON.stringify({ provider, classIndex, folderPath, folderCounts, folderShape, frameOrigins: probe.frames().map(frame => { try { return new URL(frame.url()).origin; } catch { return "unavailable"; } }) }));
        } else {
        const after = await probe.evaluate(() => ({
          tabs: [...document.querySelectorAll<HTMLElement>('[role="tab"]')].map(element => ({ label: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 60), selected: element.getAttribute("aria-selected") })),
          fileControls: [...document.querySelectorAll<HTMLElement>('button, a, [role="button"]')].map(element => (element.getAttribute("aria-label") ?? element.getAttribute("title") ?? element.textContent ?? "").replace(/\s+/g, " ").trim()).filter(label => /^(files|filer|open in sharepoint|åpne i sharepoint)$/i.test(label)).slice(0, 20),
          frames: document.querySelectorAll("iframe").length,
          tableRows: document.querySelectorAll('[role="row"], tr').length,
          pptxLabels: [...document.querySelectorAll<HTMLElement>('a, [role="link"], [role="row"], [role="button"]')].filter(element => /\.pptx\b/i.test(element.getAttribute("aria-label") ?? element.textContent ?? "")).slice(0, 10).map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute("role"), classes: (element.getAttribute("class") ?? "").split(/\s+/).slice(0, 6), childCount: element.children.length })),
        }));
        const frames = await Promise.all(probe.frames().map(async frame => {
          try {
            const url = new URL(frame.url());
            const structure = await frame.evaluate(() => ({
              bodyLength: document.body?.innerText?.length ?? 0,
              tables: document.querySelectorAll('table, [role="grid"]').length,
              rows: document.querySelectorAll('tr, [role="row"]').length,
              pptxCount: [...document.querySelectorAll<HTMLElement>('a, [role="link"], [role="row"], [role="button"]')].filter(element => /\.pptx\b/i.test(element.getAttribute("aria-label") ?? element.textContent ?? "")).length,
              navigationLabels: [...document.querySelectorAll<HTMLElement>('button, a, [role="button"], [role="tab"]')].map(element => (element.getAttribute("aria-label") ?? element.getAttribute("title") ?? element.textContent ?? "").replace(/\s+/g, " ").trim()).filter(label => /^(files|filer|shared|delt|open in sharepoint|åpne i sharepoint)$/i.test(label)).slice(0, 20),
              tablesShape: [...document.querySelectorAll<HTMLTableElement>("table")].slice(0, 4).map(table => ({ rowCount: table.rows.length, headings: [...table.querySelectorAll("th")].map(cell => (cell.textContent ?? "").trim().slice(0, 50)), rows: [...table.querySelectorAll("tr")].slice(0, 4).map(row => ({ cells: row.cells.length, childTags: [...row.children].map(child => child.tagName.toLowerCase()), textLength: (row.textContent ?? "").trim().length, role: row.getAttribute("role"), classes: (row.getAttribute("class") ?? "").split(/\s+/).slice(0, 5) })) })),
              controls: [...document.querySelectorAll<HTMLElement>('button, [role="button"], [role="tab"], a')].slice(0, 60).map(element => { const label = (element.getAttribute("aria-label") ?? element.getAttribute("title") ?? element.textContent ?? "").replace(/\s+/g, " ").trim(); return { tag: element.tagName.toLowerCase(), role: element.getAttribute("role"), label: /^(documents|dokumenter|files|filer|shared|delt|general|generelt|download|last ned|open|åpne|name|navn|modified|endret|new|ny|refresh|oppdater)$/i.test(label) ? label : null, labelLength: label.length, classes: (element.getAttribute("class") ?? "").split(/\s+/).slice(0, 4) }; }),
              rowShapes: [...document.querySelectorAll<HTMLElement>('[role="row"]')].slice(0, 12).map(row => ({ children: row.children.length, classes: (row.getAttribute("class") ?? "").split(/\s+/).slice(0, 6), attributes: [...row.attributes].map(item => item.name).filter(name => name !== "style" && name !== "class").slice(0, 12), automation: row.getAttribute("data-automationid"), textLength: (row.textContent ?? "").trim().length, extension: /\.pptx\b/i.test(row.textContent ?? "") ? "pptx" : /\.pdf\b/i.test(row.textContent ?? "") ? "pdf" : /\.docx\b/i.test(row.textContent ?? "") ? "docx" : "other", cells: [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')].map(cell => ({ automation: cell.getAttribute("data-automationid"), classes: (cell.getAttribute("class") ?? "").split(/\s+/).slice(0, 4), links: cell.querySelectorAll("a").length, buttons: cell.querySelectorAll("button").length, icons: [...cell.querySelectorAll<HTMLElement>('[title], [aria-label]')].map(item => item.getAttribute("title") ?? item.getAttribute("aria-label")).filter(label => /folder|powerpoint|presentation|file|mappe/i.test(label ?? "")).slice(0, 4) })) })),
            }));
            return { origin: url.origin, pathShape: url.pathname.replace(/[a-f0-9-]{20,}/gi, "*").slice(0, 120), structure };
          } catch { return { origin: "unavailable" }; }
        }));
        console.log(JSON.stringify({ provider, classIndex, first, generalCount, sharedCount, after, frames }));
        }
      } else {
      const screenshotPath = args.get("screenshot-path");
      if (screenshotPath) await probe.screenshot({ path: screenshotPath, fullPage: false });
      const structure = await probe.evaluate(String.raw`(() => {
        const clean = node => (node.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(token)).slice(0, 6);
        const candidate = document.querySelector('[role="tablist"], [class*="channel" i], [class*="post" i], [role="list"]');
        const postCandidates = [...document.querySelectorAll('[data-tid*="post" i], [class*="post" i], [class*="message" i], [role="article"]')].filter(node => (node.textContent ?? '').trim().length > 20).slice(0, 20).map(node => ({ tag: node.tagName.toLowerCase(), classes: clean(node), role: node.getAttribute('role'), attributes: [...node.attributes].map(attribute => attribute.name).filter(name => name !== 'class' && name !== 'style').slice(0, 10), textLength: (node.textContent ?? '').trim().length, childCount: node.children.length }));
        const postAnchor = [...document.querySelectorAll('body *')].find(node => node.children.length === 0 && (node.textContent ?? '').trim() === 'Uke 39');
        const ancestry = []; let ancestor = postAnchor;
        for (let depth = 0; ancestor && depth < 8; depth++, ancestor = ancestor.parentElement) ancestry.push({ tag: ancestor.tagName.toLowerCase(), classes: clean(ancestor), role: ancestor.getAttribute('role'), attributes: [...ancestor.attributes].map(attribute => attribute.name).filter(name => name !== 'class' && name !== 'style').slice(0, 10), childCount: ancestor.children.length, textLength: (ancestor.textContent ?? '').trim().length });
        return { routeShape: (location.pathname + location.hash).split("/").map(segment => segment.length > 30 || /\d/.test(segment) ? "*" : segment).join("/"), candidate: candidate ? { tag: candidate.tagName.toLowerCase(), classes: clean(candidate), role: candidate.getAttribute("role"), attributes: [...candidate.attributes].map(attribute => attribute.name).filter(name => name !== "class" && name !== "style"), childCount: candidate.children.length } : null, counts: { tabs: document.querySelectorAll('[role="tab"]').length, links: document.querySelectorAll("a").length, groups: document.querySelectorAll('[role="group"]').length, messageElements: document.querySelectorAll('[data-tid="chat-pane-message"], [data-tid="message-pane-list-runway"] [role="listitem"]').length }, genericLabels: [...document.querySelectorAll("button, a, [role=button], [role=tab]")].map(node => (node.getAttribute("aria-label") ?? node.getAttribute("title") ?? node.textContent ?? "").replace(/\s+/g, " ").trim()).filter(label => /^(general|generelt|posts|innlegg|files|filer|assignments|oppgaver|classwork|kanaler|channels|see all|vis alle)$/i.test(label)).slice(0, 40), postCandidates, ancestry };
      })()`);
      const frames = await Promise.all(probe.frames().map(async frame => {
        try {
          const url = new URL(frame.url());
          const counts = await frame.evaluate(() => ({ bodyLength: document.body?.innerText?.length ?? 0, roleArticles: document.querySelectorAll('[role="article"]').length, roleListItems: document.querySelectorAll('[role="listitem"]').length, postClasses: document.querySelectorAll('[class*="post" i], [class*="conversation" i], [class*="message" i]').length }));
          return { origin: url.origin, routeShape: url.pathname.split("/").map(segment => segment.length > 30 || /\d/.test(segment) ? "*" : segment).join("/"), counts };
        } catch { return { origin: "unavailable", counts: null }; }
      }));
      console.log(JSON.stringify({ provider, classCardCount: count, classIndex, classCategories, structure, frames }));
      }
    } finally { await probe.close(); }
  } else if (args.get("teams-sidebar-shape") === "true" && provider === "teams") {
    const sidebar = await page.evaluate(String.raw`(() => {
      const safeClasses = node => (node.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(token)).slice(0, 8);
      const shape = (node, depth) => ({ tag: node.tagName.toLowerCase(), role: node.getAttribute("role"), classes: safeClasses(node), attributes: [...node.attributes].map(attribute => attribute.name).filter(name => name !== "class" && name !== "style").slice(0, 12), children: depth < 4 ? [...node.children].slice(0, 12).map(child => shape(child, depth + 1)) : [] });
      const buttons = [...document.querySelectorAll("button, [role=button]")];
      const classes = buttons.find(node => /^Classes\s*\d+\s*teams$/i.test((node.textContent ?? "").replace(/\s+/g, " ").trim()));
      const panel = classes?.parentElement?.parentElement?.querySelector(".fui-AccordionPanel");
      const teamRows = panel ? [...panel.querySelectorAll(":scope > div > div > div")] : [];
      return { found: !!classes, expanded: classes?.getAttribute("aria-expanded"), button: classes ? shape(classes, 0) : null, parent: classes?.parentElement ? shape(classes.parentElement, 0) : null, grandparent: classes?.parentElement?.parentElement ? shape(classes.parentElement.parentElement, 0) : null, firstTeam: teamRows[0] ? shape(teamRows[0], 0) : null, teamRowCount: teamRows.length, surroundingLinks: classes?.parentElement?.parentElement ? [...classes.parentElement.parentElement.querySelectorAll("a")].slice(0, 30).map(node => ({ classes: safeClasses(node), hrefShape: (node.getAttribute("href") ?? "").split("/").map(segment => segment.length > 30 || /\d/.test(segment) ? "*" : segment).join("/"), textLength: (node.textContent ?? "").trim().length })) : [] };
    })()`);
    console.log(JSON.stringify({ provider, sidebar }));
  } else if (args.get("teams-tree-only") === "true" && provider === "teams") {
    const tree = await page.evaluate(() => {
      const items = [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')];
      const navigationLabels = [...document.querySelectorAll<HTMLElement>("button, a, [role=button]")].map(element => (element.getAttribute("aria-label") ?? element.getAttribute("title") ?? element.textContent ?? "").replace(/\s+/g, " ").trim()).filter(label => label.length < 100 && /teams|team|chat|kanal|channel|klasse|class|assignment|oppgav|posts|innlegg|files|filer|grades|karakter/i.test(label)).slice(0, 40);
      return { treeCount: document.querySelectorAll('[role="tree"]').length, itemCount: items.length, navigationLabels, items: items.slice(0, 100).map(element => {
        const label = (element.getAttribute("aria-label") ?? element.textContent ?? "").trim();
        const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") ?? "" : "";
        return {
          tag: element.tagName.toLowerCase(), level: element.getAttribute("aria-level"), expanded: element.getAttribute("aria-expanded"), selected: element.getAttribute("aria-selected"),
          category: /^(general|generelt)$/i.test(label) ? "general" : /^(assignments|oppgaver)$/i.test(label) ? "assignments" : /^(chat|teams|classes|kanaler|channels)$/i.test(label) ? "navigation" : "other",
          hrefShape: href.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/").slice(0, 120),
          classes: (element.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(token)).slice(0, 4),
        };
      }) };
    });
    console.log(JSON.stringify({ provider, tree }));
  } else if (args.get("tab-inventory") === "true") {
    const tabs = browser.contexts().flatMap(context => context.pages()).map(candidate => {
      try { const url = new URL(candidate.url()); return { origin: url.origin, routeShape: `${url.pathname}${url.hash}`.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/").slice(0, 120) }; }
      catch { return { origin: "non-http", routeShape: "" }; }
    });
    console.log(JSON.stringify({ provider, tabs }));
  } else if (args.get("probe-all-teams") === "true" && provider === "teams") {
    const probe = await browser.contexts()[0].newPage();
    try {
      await probe.goto(page.url(), { waitUntil: "domcontentloaded" });
      if (!["https://teams.microsoft.com", "https://teams.cloud.microsoft"].includes(new URL(probe.url()).origin)) throw new Error("teams_probe_left_registered_origin");
      const back = probe.locator('[aria-label="Back to All teams"], [title="Back to All teams"]');
      await back.waitFor({ timeout: 15_000 });
      if (await back.count() !== 1) throw new Error("teams_all_teams_navigation_ambiguous");
      await back.click();
      await probe.waitForTimeout(6_000);
      const structure = await probe.evaluate(() => {
        const candidate = document.querySelector<HTMLElement>('[class*="team-card" i], [class*="teamCard" i], [role="gridcell"], [role="listitem"]');
        return {
          routeShape: `${location.pathname}${location.hash}`.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/").slice(0, 120),
          counts: { teamClasses: document.querySelectorAll('[class*="team" i]').length, listItems: document.querySelectorAll('[role="listitem"]').length, gridCells: document.querySelectorAll('[role="gridcell"]').length, anchors: document.querySelectorAll("a").length, iframes: document.querySelectorAll("iframe").length, bodyCharacters: document.body?.innerText?.length ?? 0 },
          candidateShape: candidate ? { tag: candidate.tagName.toLowerCase(), role: candidate.getAttribute("role"), classes: (candidate.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(token)).slice(0, 8), attributes: [...candidate.attributes].map(attribute => attribute.name).filter(name => name !== "style" && name !== "class").slice(0, 12) } : null,
        };
      });
      const frames = await Promise.all(probe.frames().map(async frame => { try { return { origin: new URL(frame.url()).origin, counts: await frame.evaluate(() => ({ teamClasses: document.querySelectorAll('[class*="team" i]').length, listItems: document.querySelectorAll('[role="listitem"]').length, buttons: document.querySelectorAll("button").length, bodyCharacters: document.body?.innerText?.length ?? 0 })) }; } catch { return { origin: "unavailable", counts: null }; } }));
      console.log(JSON.stringify({ provider, structure, frames }));
    } finally { await probe.close(); }
  } else if (args.get("probe-assignments") === "true" && provider === "teams") {
    const probe = await browser.contexts()[0].newPage();
    try {
      if (args.get("probe-assignments-direct") === "true") {
        await probe.goto("https://assignments.edu.cloud.microsoft/classes/all/list", { waitUntil: "domcontentloaded", timeout: 30_000 });
        await probe.waitForTimeout(8_000);
        const destination = new URL(probe.url());
        const directShape = await probe.evaluate(() => ({
          cards: document.querySelectorAll(".aui-assignmentListCard").length,
          tabs: [...document.querySelectorAll<HTMLElement>('[role="tab"]')].map(item => (item.getAttribute("aria-label") ?? item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(item => /^(upcoming|past due|completed)$/i.test(item)),
          loadingIndicators: document.querySelectorAll('[role="progressbar"], [aria-busy="true"], [class*="loading" i]').length,
          passwordFields: document.querySelectorAll('input[type="password"]').length,
          bodyCharacters: document.body?.innerText?.length ?? 0,
        }));
        console.log(JSON.stringify({ provider, directAssignmentShape: { origin: destination.origin, routeShape: destination.pathname, ...directShape } }));
      }
      await probe.goto(page.url(), { waitUntil: "domcontentloaded" });
      if (!["https://teams.microsoft.com", "https://teams.cloud.microsoft"].includes(new URL(probe.url()).origin)) throw new Error("teams_probe_left_registered_origin");
      await probe.locator("button").filter({ hasText: /Assignments/ }).first().waitFor({ timeout: 20_000 });
      const appNavigation = probe.getByRole("button", { name: /^Assignments \(Ctrl\+Shift\+4\)$/ });
      const appTextNavigation = probe.locator("button").filter({ hasText: /^Assignments\s*\(Ctrl\+Shift\+4\)$/ });
      const legacyNavigation = probe.getByRole("treeitem", { name: "Assignments", exact: true });
      const assignments = await appNavigation.count() === 1 ? appNavigation : await appTextNavigation.count() === 1 ? appTextNavigation : legacyNavigation;
      if (await assignments.count() !== 1) throw new Error("teams_assignments_navigation_ambiguous");
      await assignments.click();
      await probe.waitForTimeout(8_000);
      if (args.get("probe-assignment-list") === "true") {
        const assignmentsFrame = probe.frames().find(frame => {
          try { return new URL(frame.url()).origin === "https://assignments.edu.cloud.microsoft"; } catch { return false; }
        });
        if (!assignmentsFrame) throw new Error("teams_assignments_frame_missing");
        const viewAssignments = assignmentsFrame.getByRole("link", { name: /^View assignments$/i });
        if (await viewAssignments.count() !== 1 && new URL(assignmentsFrame.url()).pathname !== "/classes/all/list") {
          const navigationShape = await assignmentsFrame.evaluate(() => ({
            routeShape: location.pathname,
            viewAssignmentsLinks: [...document.querySelectorAll<HTMLAnchorElement>("a")].filter(link => /^View assignments$/i.test((link.textContent ?? "").trim())).length,
            assignmentListCards: document.querySelectorAll(".aui-assignmentListCard").length,
            controls: [...document.querySelectorAll<HTMLElement>("a, button, [role=tab]")].map(item => ({
              tag: item.tagName.toLowerCase(),
              role: item.getAttribute("role"),
              label: (item.getAttribute("aria-label") ?? item.textContent ?? "").replace(/\s+/g, " ").trim(),
            })).filter(item => /^(view assignments|assignments|upcoming|past due|completed|see all|open)$/i.test(item.label)).slice(0, 20),
          }));
          console.log(JSON.stringify({ provider, assignmentNavigationShape: navigationShape }));
          throw new Error("teams_view_assignments_navigation_ambiguous");
        }
        if (await viewAssignments.count() === 1) await viewAssignments.click();
        await probe.waitForTimeout(8_000);
        const listShape = await assignmentsFrame.evaluate(() => ({
          routeShape: location.pathname,
          cardCount: document.querySelectorAll(".aui-assignmentListCard").length,
          cardIdentityShape: [...document.querySelectorAll<HTMLElement>(".aui-assignmentListCard")].slice(0, 3).map(card => ({
            idLength: card.id.length,
            dataTestLength: (card.getAttribute("data-test") ?? "").length,
            anchorCount: card.querySelectorAll("a[href]").length,
            anchorPathShapes: [...card.querySelectorAll<HTMLAnchorElement>("a[href]")].slice(0, 3).map(anchor => { try { const url = new URL(anchor.href); return `${url.origin}${url.pathname}`.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "*"); } catch { return "invalid"; } }),
          })),
          tabLabels: [...document.querySelectorAll<HTMLElement>('[role="tab"]')].map(item => (item.getAttribute("aria-label") ?? item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(item => /^(upcoming|past due|completed)$/i.test(item)),
          bodyCharacters: document.body?.innerText?.length ?? 0,
          loadingIndicators: document.querySelectorAll('[role="progressbar"], [aria-busy="true"], [class*="loading" i]').length,
        }));
        console.log(JSON.stringify({ provider, assignmentListShape: listShape }));
        if (args.get("probe-assignment-dialog") === "true") {
          await assignmentsFrame.locator('[role="dialog"], [role="alertdialog"], .fui-DialogSurface').first().waitFor({ timeout: 30_000 }).catch(() => undefined);
          const dialogs = await assignmentsFrame.locator('[role="dialog"], [role="alertdialog"], .fui-DialogSurface').evaluateAll(elements => elements.map(element => ({
            text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 2000),
            buttons: [...element.querySelectorAll("button")].map(button => ({ label: button.getAttribute("aria-label") ?? button.textContent, disabled: button.disabled })),
          })));
          console.log(JSON.stringify({ provider, assignmentDialogs: dialogs }));
          console.log(JSON.stringify({ provider, teamsDialogs: await probe.locator('[role="dialog"], [role="alertdialog"], .fui-DialogSurface').evaluateAll(elements => elements.map(element => ({
            text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 2000),
            buttons: [...element.querySelectorAll("button")].map(button => ({ label: button.getAttribute("aria-label") ?? button.textContent, disabled: button.disabled })),
          }))) }));
        }
        if (args.get("probe-assignment-settle") === "true") {
          const counts = [];
          const completed = assignmentsFrame.getByRole("tab", { name: /Completed/i });
          await completed.click();
          for (let second = 0; second < 35; second++) {
            counts.push(await assignmentsFrame.evaluate(time => ({
              second: time,
              cards: document.querySelectorAll(".aui-assignmentListCard").length,
              completedSelected: [...document.querySelectorAll<HTMLElement>('[role="tab"][aria-selected="true"]')].some(tab => /Completed/i.test(tab.textContent ?? "")),
              visibleLoading: [...document.querySelectorAll<HTMLElement>('[role="progressbar"], [aria-busy="true"], [class*="loading" i]')].filter(element => { const style = getComputedStyle(element); return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0; }).length,
            }), second));
            await probe.waitForTimeout(1_000);
          }
          console.log(JSON.stringify({ provider, assignmentSettle: counts }));
        }
        if (args.get("probe-assignment-return") === "true") {
          const listUrl = assignmentsFrame.url();
          const section = args.get("probe-assignment-return-section") ?? "Upcoming";
          const limit = Number(args.get("probe-assignment-return-limit") ?? "3");
          if (!["Upcoming", "Past due", "Completed"].includes(section) || !Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("teams_assignment_return_probe_options_invalid");
          const results = [];
          for (let index = 0; index < limit; index++) {
            const current = probe.frames().find(frame => { try { return new URL(frame.url()).origin === "https://assignments.edu.cloud.microsoft"; } catch { return false; } });
            if (!current) throw new Error("teams_assignments_frame_missing");
            const tab = current.getByRole("tab", { name: new RegExp(section, "i") });
            await tab.waitFor({ timeout: 15_000 });
            await tab.click();
            const cards = current.locator(".aui-assignmentListCard");
            const cardCount = await cards.count();
            if (index >= cardCount) break;
            const id = await cards.nth(index).getAttribute("id");
            if (!id) throw new Error("teams_assignment_card_identity_missing");
            await cards.nth(index).click();
            await probe.waitForTimeout(1_000);
            const beforeRoute = new URL(current.url()).pathname;
            let errorName: string | null = null;
            let stage = "navigate";
            try {
              await current.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
              stage = "tab";
              const reopened = current.getByRole("tab", { name: new RegExp(section, "i") });
              await reopened.waitFor({ timeout: 15_000 });
              await reopened.click();
              stage = "card";
              await current.locator(`[id="${id}"]`).waitFor({ timeout: 15_000 });
              stage = "done";
            } catch (error) {
              errorName = error instanceof Error ? error.name : "unknown";
            }
            const afterRoute = (() => { try { return new URL(current.url()).pathname; } catch { return "unavailable"; } })();
            results.push({ section, index, cardCount, beforeRoute, stage, errorName, afterRoute, tabCount: await current.getByRole("tab", { name: new RegExp(section, "i") }).count().catch(() => -1), afterCards: await current.locator(".aui-assignmentListCard").count().catch(() => -1), matchingCardCount: await current.locator(`[id="${id}"]`).count().catch(() => -1) });
            if (stage !== "done") break;
          }
          console.log(JSON.stringify({ provider, assignmentReturnShape: results }));
        }
        if (args.get("probe-assignment-paging") === "true") {
          const sections = [];
          for (const label of ["Upcoming", "Past due", "Completed"]) {
            const tab = assignmentsFrame.getByRole("tab", { name: new RegExp(label, "i") });
            if (await tab.count() !== 1) throw new Error("teams_assignment_tab_ambiguous");
            await tab.click();
            await probe.waitForTimeout(2_500);
            const shape = await assignmentsFrame.evaluate(() => {
              const first = document.querySelector<HTMLElement>(".aui-assignmentListCard");
              const scrollAncestors = [];
              for (let item = first?.parentElement; item && scrollAncestors.length < 8; item = item.parentElement) {
                const style = getComputedStyle(item);
                scrollAncestors.push({ tag: item.tagName.toLowerCase(), scrollHeight: item.scrollHeight, clientHeight: item.clientHeight, overflowY: style.overflowY });
              }
              const pagingLabels = [...document.querySelectorAll<HTMLElement>("button, a, [role=button]")].map(item => (item.getAttribute("aria-label") ?? item.getAttribute("title") ?? item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(item => /^(next|previous|more|load more|show more|older|newer|\d+|neste|forrige|vis flere)$/i.test(item)).slice(0, 20);
              return { cards: document.querySelectorAll(".aui-assignmentListCard").length, scrollAncestors, pagingLabels, progressIndicators: document.querySelectorAll('[role="progressbar"], [aria-busy="true"]').length };
            });
            sections.push({ label, ...shape });
          }
          console.log(JSON.stringify({ provider, assignmentPaging: sections }));
        }
        if (args.get("probe-assignment-controls") === "true") {
          const controls = await assignmentsFrame.evaluate(() => ({
            routeShape: location.pathname,
            cards: document.querySelectorAll(".aui-assignmentListCard").length,
            buttons: [...document.querySelectorAll<HTMLElement>("button, [role=button]")].slice(0, 50).map(element => ({ label: (element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80), classes: (element.getAttribute("class") ?? "").split(/\s+/).filter(token => /filter|assignment|tab|dropdown|select|course|class/i.test(token)).slice(0, 6), expanded: element.getAttribute("aria-expanded") })),
            tabs: [...document.querySelectorAll<HTMLElement>("[role=tab]")].map(element => ({ label: (element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80), selected: element.getAttribute("aria-selected") })),
            selects: [...document.querySelectorAll<HTMLSelectElement>("select")].map(element => ({ options: [...element.options].map(option => option.textContent?.trim().slice(0, 80)), valueLength: element.value.length })),
            links: [...document.querySelectorAll<HTMLAnchorElement>("a")].slice(0, 30).map(element => ({ label: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80), routeShape: (() => { try { return new URL(element.href).pathname.replace(/\/[a-f0-9-]{20,}/gi, "/*"); } catch { return ""; } })() })),
          }));
          console.log(JSON.stringify({ provider, assignmentControls: controls }));
          const tabCounts = [];
          for (const label of ["Upcoming", "Past due", "Completed"]) {
            const tab = assignmentsFrame.getByRole("tab", { name: new RegExp(label, "i") });
            if (await tab.count() !== 1) throw new Error("teams_assignment_tab_ambiguous");
            await tab.click();
            await probe.waitForTimeout(2_500);
            tabCounts.push({ label, routeShape: new URL(assignmentsFrame.url()).pathname, cards: await assignmentsFrame.locator(".aui-assignmentListCard").count(), cardIds: await assignmentsFrame.locator(".aui-assignmentListCard").evaluateAll(elements => elements.map(element => element.id)) });
          }
          const filter = assignmentsFrame.getByRole("button", { name: "Open filter pane" });
          if (await filter.count() === 1) await filter.click();
          const filterControls = await assignmentsFrame.evaluate(() => [...document.querySelectorAll<HTMLElement>("[role=checkbox], input[type=checkbox], [role=combobox], select, [role=option]")].slice(0, 60).map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute("role"), label: (element.getAttribute("aria-label") ?? element.parentElement?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80), checked: element.getAttribute("aria-checked"), classes: (element.getAttribute("class") ?? "").split(/\s+/).filter(token => /filter|course|class/i.test(token)).slice(0, 5) })));
          const combo = assignmentsFrame.locator('[role="combobox"]');
          if (await combo.count() === 1) await combo.click();
          const filterOptions = await assignmentsFrame.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="option"], [role="listbox"], [role="checkbox"]')].slice(0, 60).map(element => ({ role: element.getAttribute("role"), labelLength: (element.textContent ?? "").trim().length, selected: element.getAttribute("aria-selected"), checked: element.getAttribute("aria-checked") })));
          console.log(JSON.stringify({ provider, tabCounts, filterControls, filterOptions }));
          if (args.get("probe-assignment-filter-coverage") === "true") {
            // The filter flyout overlays the tabs; the loop above already left
            // Completed selected before opening it.
            const allIds = new Set(await assignmentsFrame.locator(".aui-assignmentListCard").evaluateAll(elements => elements.map(element => element.id)));
            const classCombo = assignmentsFrame.locator('[data-test="list-class-selector"]');
            if (await classCombo.count() !== 1) throw new Error("teams_assignment_class_filter_ambiguous");
            const optionCount = await assignmentsFrame.locator('[role="option"]').count();
            if (optionCount < 1 || optionCount > 30) throw new Error("teams_assignment_filter_options_unbounded");
            const filterCoverage = [];
            for (let index = 0; index < optionCount; index++) {
              if (index > 0) await classCombo.click();
              await assignmentsFrame.locator('[role="option"]:visible').nth(index).click();
              await probe.waitForTimeout(3_000);
              const ids = await assignmentsFrame.locator(".aui-assignmentListCard").evaluateAll(elements => elements.map(element => element.id));
              filterCoverage.push({ optionIndex: index, count: ids.length, notInUnfilteredView: ids.filter(id => !allIds.has(id)).length });
            }
            const resetControls = await assignmentsFrame.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, [role="button"]')].map(element => (element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim()).filter(label => /clear|reset|remove|all classes|filter/i.test(label) && label.length < 80).slice(0, 15));
            console.log(JSON.stringify({ provider, assignmentFilterCoverage: { unfilteredCount: allIds.size, options: filterCoverage, resetControls } }));
          }
        }
        if (args.get("probe-assignment-detail") === "true") {
          const cardIndex = Number(args.get("probe-assignment-card-index") ?? "0");
          if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 20) throw new Error("teams_assignment_probe_index_invalid");
          const firstCard = assignmentsFrame.locator(".aui-assignmentListCard").nth(cardIndex);
          if (await firstCard.count() !== 1) throw new Error("teams_assignment_card_missing");
          const cardDomId = await firstCard.getAttribute("id");
          await firstCard.click();
          await probe.waitForTimeout(8_000);
          const detailRouteId = new URL(assignmentsFrame.url()).pathname.split("/").at(-1) ?? "";
          console.log(JSON.stringify({ provider, assignmentCardRouteIdentity: { domIdPresent: Boolean(cardDomId), matchesDetailRouteId: cardDomId === detailRouteId, domIdContainsDetailRouteId: Boolean(cardDomId && detailRouteId && cardDomId.includes(detailRouteId)) } }));
          if (args.get("probe-assignment-file-menu") === "true") {
            const more = assignmentsFrame.locator('[class*="resource-well" i] button[class*="more-options-button" i]').first();
            if (await more.count() === 1) {
              await more.click();
              const menuShape = await assignmentsFrame.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menu"] button, [role="menu"] a')].slice(0, 20).map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute("role"), label: (element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60), hrefOrigin: element instanceof HTMLAnchorElement && element.href ? (() => { try { return new URL(element.href).origin; } catch { return "invalid"; } })() : null })));
              console.log(JSON.stringify({ provider, assignmentFileMenuShape: menuShape }));
            }
          }
        }
      }
      const structure = await probe.evaluate(() => {
        const known = /^(assignments|assigned|completed|upcoming|past due|returned|turned in|to do|due|all|oppgaver|tildelt|fullført|kommende|forsinket|levert|alle)$/i;
        const labels = [...document.querySelectorAll<HTMLElement>("button, a, [role=tab]")].map(element => (element.getAttribute("aria-label") ?? element.getAttribute("title") ?? element.textContent ?? "").trim()).filter(label => known.test(label));
        const candidate = document.querySelector<HTMLElement>('[class*="assignment" i], [class*="task-card" i], [role="listitem"]');
        return {
          routeShape: `${location.pathname}${location.hash}`.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/").slice(0, 120),
          knownLabels: [...new Set(labels)],
          testIds: [...new Set([...document.querySelectorAll<HTMLElement>("[data-testid]")].map(element => element.getAttribute("data-testid")).filter((value): value is string => Boolean(value && /^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(value))))].slice(0, 60),
          counts: { assignmentClasses: document.querySelectorAll('[class*="assignment" i]').length, listItems: document.querySelectorAll('[role="listitem"]').length, links: document.querySelectorAll("main a").length, buttons: document.querySelectorAll("main button").length, iframes: document.querySelectorAll("iframe").length },
          candidateShape: candidate ? { tag: candidate.tagName.toLowerCase(), classes: (candidate.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(token)).slice(0, 8), attributes: [...candidate.attributes].map(attribute => attribute.name).filter(name => name !== "style" && name !== "class").slice(0, 12) } : null,
        };
      });
      const frames = await Promise.all(probe.frames().map(async frame => {
        try {
          const origin = new URL(frame.url()).origin;
          const layout = await frame.evaluate(() => {
            const candidate = document.querySelector<HTMLElement>('[class*="assignment" i], [role="listitem"]');
            const known = /^(assignments|upcoming|past due|completed|view assignments|oppgaver|kommende|forsinket|fullført|se oppgaver)$/i;
            return {
              counts: { assignmentClasses: document.querySelectorAll('[class*="assignment" i]').length, listItems: document.querySelectorAll('[role="listitem"]').length, buttons: document.querySelectorAll("button").length, bodyCharacters: document.body?.innerText?.length ?? 0 },
              knownLabels: [...new Set([...document.querySelectorAll<HTMLElement>("button, a, [role=tab]")].map(element => (element.getAttribute("aria-label") ?? element.textContent ?? "").trim()).filter(label => known.test(label)))],
              knownControlShape: [...document.querySelectorAll<HTMLElement>("button, a, [role=tab], [role=button]")].filter(element => known.test((element.getAttribute("aria-label") ?? element.textContent ?? "").trim())).slice(0, 12).map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute("role"), classes: (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).slice(0, 5) })),
              tabLabels: [...document.querySelectorAll<HTMLElement>('[role="tab"]')].map(element => ({ label: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim(), selected: element.getAttribute("aria-selected") })).filter(item => /^(assigned|past due|completed|returned|drafts|upcoming|to do|tildelt|forsinket|fullført|returnert|kommende)$/i.test(item.label)).slice(0, 12),
              candidateShape: candidate ? { tag: candidate.tagName.toLowerCase(), classes: (candidate.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(token)).slice(0, 8), attributes: [...candidate.attributes].map(attribute => attribute.name).filter(name => name !== "style" && name !== "class").slice(0, 12) } : null,
              structuralClasses: [...new Set([...document.querySelectorAll<HTMLElement>('[class*="assignment" i], [class*="course" i], [class*="task" i]')].flatMap(element => (element.getAttribute("class") ?? "").split(/\s+/)).filter(token => /assignment|course|task|filter|list/i.test(token) && /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(token)))].slice(0, 60),
              listItemShape: [...document.querySelectorAll<HTMLElement>('[role="listitem"]')].slice(0, 4).map(element => ({ tag: element.tagName.toLowerCase(), classes: (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).slice(0, 6), attributes: [...element.attributes].map(attribute => attribute.name).filter(name => name !== "style" && name !== "class"), childTags: [...element.children].slice(0, 8).map(child => child.tagName.toLowerCase()) })),
              cardTree: (() => { const card = document.querySelector<HTMLElement>(".aui-assignmentListCard"); const shape = (element: Element, depth: number): unknown => ({ tag: element.tagName.toLowerCase(), classes: (element.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(token)).slice(0, 5), role: element.getAttribute("role"), attributes: [...element.attributes].map(attribute => attribute.name).filter(name => !["style", "class"].includes(name)).slice(0, 8), textLength: element.children.length ? null : (element.textContent ?? "").trim().length, children: depth < 3 ? [...element.children].slice(0, 10).map(child => shape(child, depth + 1)) : [] }); return card ? shape(card, 0) : null; })(),
              detailFields: [...document.querySelectorAll<HTMLElement>('[class*="assignment-details" i], [class*="assignment-title" i]')].slice(0, 45).map(element => ({ tag: element.tagName.toLowerCase(), classes: (element.getAttribute("class") ?? "").split(/\s+/).filter(token => /assignment|metadata|due|file|resource/i.test(token)).slice(0, 5), attributes: [...element.attributes].map(attribute => attribute.name).filter(name => !["style", "class"].includes(name)).slice(0, 8), textLength: (element.textContent ?? "").trim().length, label: /^(instructions|due|due date|assigned|points|my work|files|resources|description|class|status|handed in|not handed in)$/i.test((element.textContent ?? "").trim()) ? (element.textContent ?? "").trim() : null, children: [...element.children].slice(0, 8).map(child => ({ tag: child.tagName.toLowerCase(), classes: (child.getAttribute("class") ?? "").split(/\s+/).filter(token => /assignment|metadata|due|file|resource/i.test(token)).slice(0, 4), textLength: (child.textContent ?? "").trim().length })) })),
              fileContainerShape: [...document.querySelectorAll<HTMLElement>('[class*="assignment-details-files-container" i]')].slice(0, 4).map(container => { const shape = (node: Element, depth: number): unknown => ({ tag: node.tagName.toLowerCase(), role: node.getAttribute("role"), classes: (node.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(token)).slice(0, 5), attributes: [...node.attributes].map(attribute => attribute.name).filter(name => !["style", "class"].includes(name)).slice(0, 8), textLength: (node.textContent ?? "").trim().length, children: depth < 4 ? [...node.children].slice(0, 10).map(child => shape(child, depth + 1)) : [] }); return shape(container, 0); }),
              fileActionShape: [...document.querySelectorAll<HTMLElement>('[class*="assignment-details-files-container" i] a, [class*="assignment-details-files-container" i] button, [class*="assignment-details-files-container" i] [role="button"]')].slice(0, 20).map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute("role"), labelLength: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().length, hrefOrigin: element instanceof HTMLAnchorElement && element.href ? (() => { try { return new URL(element.href).origin; } catch { return "invalid"; } })() : null, hrefPathShape: element instanceof HTMLAnchorElement && element.href ? (() => { try { return new URL(element.href).pathname.replace(/[0-9a-f-]{20,}/gi, "*").slice(0, 100); } catch { return "invalid"; } })() : null })),
              metadataShape: (() => { const element = document.querySelector<HTMLElement>('[class*="assignment-metadata-container" i]'); if (!element) return null; const shape = (node: Element, depth: number): unknown => ({ tag: node.tagName.toLowerCase(), classes: (node.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(token)).slice(0, 5), attributes: [...node.attributes].map(attribute => attribute.name).filter(name => !["style", "class"].includes(name)).slice(0, 8), textLength: (node.textContent ?? "").trim().length, children: depth < 3 ? [...node.children].slice(0, 8).map(child => shape(child, depth + 1)) : [] }); return shape(element, 0); })(),
            };
          });
          const routeShape = `${new URL(frame.url()).pathname}${new URL(frame.url()).hash}`.split("/").map(segment => /\d/.test(segment) || segment.length > 35 ? "*" : segment).join("/").slice(0, 160);
          return { origin, routeShape, ...layout };
        } catch { return { origin: "unavailable", counts: null }; }
      }));
      console.log(JSON.stringify({ provider, structure, frames }));
    } finally { await probe.close(); }
  } else if (args.get("teams-chat-layout-probe") === "true" && provider === "teams") {
    const probe = await browser.contexts()[0].newPage();
    try {
      await probe.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!["https://teams.microsoft.com", "https://teams.cloud.microsoft"].includes(new URL(probe.url()).origin)) throw new Error("teams_chat_probe_left_registered_origin");
      const chat = probe.getByRole("button", { name: /^Chat \(Ctrl\+Shift\+3\)$/ });
      await chat.waitFor({ timeout: 20_000 });
      if (await chat.count() !== 1) throw new Error("teams_chat_navigation_ambiguous");
      await chat.click();
      await probe.waitForTimeout(2_000);
      const layout = await probe.evaluate(() => {
        const safeClasses = (node: Element) => (node.getAttribute("class") ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,70}$/.test(token)).slice(0, 8);
        const shape = (node: Element, depth: number): unknown => ({ tag: node.tagName.toLowerCase(), role: node.getAttribute("role"), classes: safeClasses(node), attributes: [...node.attributes].map(attribute => attribute.name).filter(name => name !== "class" && name !== "style").slice(0, 12), children: depth < 3 ? [...node.children].slice(0, 8).map(child => shape(child, depth + 1)) : [] });
        const item = document.querySelector<HTMLElement>('[role="treeitem"], [role="listitem"], [data-tid*="chat" i]');
        const chatItems = [...document.querySelectorAll<HTMLElement>('[role="treeitem"][data-item-type]')];
        const itemTypes = Object.fromEntries([...new Set(chatItems.map(node => node.getAttribute("data-item-type") ?? "missing"))].map(type => [type, chatItems.filter(node => (node.getAttribute("data-item-type") ?? "missing") === type).length]));
        const conversationKeys = chatItems.filter(node => ["chat", "muted-chat"].includes(node.getAttribute("data-item-type") ?? "")).map(node => node.getAttribute("data-fui-tree-item-value") ?? "");
        const chatRowNames = chatItems.filter(node => ["chat", "muted-chat"].includes(node.getAttribute("data-item-type") ?? "")).slice(0, 3).map(node => {
          const labelId = node.getAttribute("aria-labelledby") ?? "";
          const label = labelId ? document.getElementById(labelId) : null;
          return { rowTextLength: node.textContent?.trim().length ?? 0, lineLengths: node.innerText.split(/\n+/).map(value => value.trim().length).filter(Boolean), labelIdPresent: Boolean(labelId), labelFound: Boolean(label), labelTextLength: label?.textContent?.trim().length ?? 0, labelDescendant: Boolean(label && node.contains(label)) };
        });
        const message = document.querySelector<HTMLElement>('[data-tid="chat-pane-message"], [data-tid="message-pane-list-runway"] [role="listitem"]');
        const messageAncestors: Array<{ tag: string; classes: string[]; scrollHeight: number; clientHeight: number; attributes: string[] }> = [];
        for (let ancestor = message?.parentElement, depth = 0; ancestor && depth < 8; ancestor = ancestor.parentElement, depth++) messageAncestors.push({ tag: ancestor.tagName.toLowerCase(), classes: safeClasses(ancestor), scrollHeight: ancestor.scrollHeight, clientHeight: ancestor.clientHeight, attributes: [...ancestor.attributes].map(attribute => attribute.name).filter(name => name !== "style" && name !== "class").slice(0, 10) });
        const scrollCandidates = ['[data-tid="message-pane-list-runway"]', '[role="log"]', '[data-tid="chat-pane-list"]'].map(selector => { const node = document.querySelector<HTMLElement>(selector); return { selector, count: document.querySelectorAll(selector).length, scrollHeight: node?.scrollHeight ?? null, clientHeight: node?.clientHeight ?? null }; });
        const ancestorDimensions = (node: HTMLElement | null) => { const result: Array<{ classes: string[]; tid: string | null; scrollHeight: number; clientHeight: number; scrollTop: number }> = []; for (let ancestor = node, depth = 0; ancestor && depth < 12; ancestor = ancestor.parentElement, depth++) result.push({ classes: safeClasses(ancestor), tid: ancestor.getAttribute("data-tid"), scrollHeight: ancestor.scrollHeight, clientHeight: ancestor.clientHeight, scrollTop: ancestor.scrollTop }); return result; };
        return { routeShape: `${location.pathname}${location.hash}`.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/").slice(0, 120), counts: { trees: document.querySelectorAll('[role="tree"]').length, treeItems: document.querySelectorAll('[role="treeitem"]').length, listItems: document.querySelectorAll('[role="listitem"]').length, chatDataElements: document.querySelectorAll('[data-tid*="chat" i]').length, messageElements: document.querySelectorAll('[data-tid="chat-pane-message"], [data-tid="message-pane-list-runway"] [role="listitem"]').length }, itemTypes, conversationKeys: { count: conversationKeys.length, distinct: new Set(conversationKeys).size, missing: conversationKeys.filter(value => !value).length, lengths: conversationKeys.slice(0, 3).map(value => value.length) }, chatRowNames, firstMessageTextLength: message?.innerText?.trim().length ?? null, scrollCandidates, runwayAncestors: ancestorDimensions(document.querySelector<HTMLElement>('[data-tid="message-pane-list-runway"]')), chatListAncestors: ancestorDimensions(chatItems.find(node => node.getAttribute("data-item-type") === "chat") ?? null), selectedChatItems: chatItems.filter(node => node.getAttribute("aria-selected") === "true").length, firstItem: item ? shape(item, 0) : null, firstMessage: message ? shape(message, 1) : null, messageAncestors };
      });
      const samples: Array<{ index: number; messageCount: number; distinctMessageIds: number; messageSetHash: string }> = [];
      if (args.get("teams-chat-sample") === "true") {
        const rows = probe.locator('[role="treeitem"][data-item-type="chat"], [role="treeitem"][data-item-type="muted-chat"]');
        const count = await rows.count();
        if (count < 1 || count > 200) throw new Error("teams_chat_row_count_unbounded");
        for (let index = 0; index < Math.min(3, count); index++) {
          await rows.nth(index).click();
          await probe.waitForTimeout(1_500);
          const ids = await probe.locator('[data-tid="chat-pane-message"][data-mid]').evaluateAll(nodes => nodes.map(node => node.getAttribute("data-mid") ?? "").filter(Boolean));
          samples.push({ index, messageCount: ids.length, distinctMessageIds: new Set(ids).size, messageSetHash: createHash("sha256").update(ids.join("\0")).digest("hex").slice(0, 12) });
        }
      }
      console.log(JSON.stringify({ provider, chatLayout: layout, samples }));
    } finally { await probe.close(); }
  } else if (args.get("navigation-only") === "true" && provider === "teams") {
    const navigation = await page.evaluate(() => {
      const known = /^(activity|chat|teams|assignments|calendar|files|onedrive|classes|school|aktivitet|samtale|team|oppgaver|kalender|filer|klasser|skole)$/i;
      const labels = [...document.querySelectorAll<HTMLElement>("button, a, [role=button]")].map(element => ({ label: (element.getAttribute("aria-label") ?? element.getAttribute("title") ?? element.textContent ?? "").trim(), tag: element.tagName.toLowerCase(), role: element.getAttribute("role") })).filter(item => known.test(item.label));
      return {
        routeShape: `${location.pathname}${location.hash}`.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/").slice(0, 120),
        knownNavigation: labels,
        messageElements: document.querySelectorAll('[data-tid="chat-pane-message"], [data-tid="message-pane-list-runway"] [role="listitem"], [role="log"] [role="listitem"]').length,
      };
    });
    console.log(JSON.stringify({ provider, navigation }));
  } else if (args.get("probe-next-week") === "true" && provider === "inschool") {
    const heading = page.locator(".userTimetable_currentWeek");
    const before = (await heading.textContent())?.trim();
    const counts: Array<{ milliseconds: number; heading: string | null; lessons: number; busy: number }> = [];
    const responses: Array<{ milliseconds: number; status: number; resourceType: string; pathShape: string }> = [];
    const started = Date.now();
    const onResponse = (response: import("playwright-core").Response) => {
      const resourceType = response.request().resourceType();
      if ((resourceType === "xhr" || resourceType === "fetch") && new URL(response.url()).origin === expectedOrigin) responses.push({ milliseconds: Date.now() - started, status: response.status(), resourceType, pathShape: new URL(response.url()).pathname.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/") });
    };
    page.on("response", onResponse);
    try {
      await page.locator('button.userTimetable_moveWeekButton[aria-label="Neste uke"]').click();
      for (let index = 0; index < 32; index++) {
        counts.push(await page.evaluate(milliseconds => ({
          milliseconds,
          heading: document.querySelector(".userTimetable_currentWeek")?.textContent?.trim() ?? null,
          lessons: document.querySelectorAll(".Timetable-TimetableItem[starttimeanddateunix]").length,
          busy: document.querySelectorAll('[aria-busy="true"], [class*="loading" i], [class*="spinner" i]').length,
        }), index * 250));
        await page.waitForTimeout(250);
      }
    } finally {
      page.off("response", onResponse);
      await page.locator('button.userTimetable_moveWeekButton[aria-label="Forrige uke"]').click();
      await page.waitForFunction(previous => document.querySelector(".userTimetable_currentWeek")?.textContent?.trim() === previous, before, { timeout: 15_000 });
    }
    console.log(JSON.stringify({ provider, before, counts, responses }));
  } else if (args.get("inschool-nav-only") === "true" && provider === "inschool") {
    const navigation = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('nav a, nav button, [class*="nav-item"]')].map(element => {
      const label = (element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim();
      const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") ?? "" : "";
      return { label, tag: element.tagName.toLowerCase(), hrefShape: href.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/").slice(0, 120) };
    }).filter(item => item.label.length <= 80 && /^(timeplan|timetable|fravær|absence|karakterer|grades|vurderinger|assessment|historikk|history|fag|subjects|oversikt|overview|oppgaver|assignments)/i.test(item.label)).slice(0, 30));
    console.log(JSON.stringify({ provider, navigation }));
  } else if (args.get("navigation-only") === "true" && provider === "inschool") {
    const navigation = await page.evaluate(() => ({
      routeShape: `${location.pathname}${location.hash}`.split("/").map(segment => /\d/.test(segment) || segment.length > 40 ? "*" : segment).join("/").slice(0, 120),
      passwordFields: document.querySelectorAll('input[type="password"]').length,
      loginPrompt: /logg inn|sign in|feide/i.test(document.body?.innerText?.slice(0, 3_000) ?? ""),
      weekHeading: document.querySelector(".userTimetable_currentWeek")?.textContent?.trim() ?? null,
      lessonCount: document.querySelectorAll(".Timetable-TimetableItem[starttimeanddateunix]").length,
      controls: [...document.querySelectorAll<HTMLButtonElement>(".userTimetable_moveWeekButton")].map((button, index) => ({
        index,
        ariaLabel: button.getAttribute("aria-label"),
        title: button.getAttribute("title"),
        disabled: button.disabled,
        svgClasses: [...button.querySelectorAll("svg")].map(svg => svg.getAttribute("class")),
      })),
    }));
    console.log(JSON.stringify({ provider, navigation }));
  } else {
  const structure = await page.evaluate(String.raw`(() => {
    const clean = value => (value ?? "").split(/\s+/).filter(token => /^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(token)).slice(0, 6);
    const candidates = [...document.querySelectorAll("nav a, nav button, [role=navigation] a, [role=navigation] button, [data-testid], [class*=timetable i], [class*=schedule i], [class*=lesson i], [class*=absence i], [class*=frav i], [role=log]")].slice(0, 600);
    const shape = candidates.map(element => ({ tag: element.tagName.toLowerCase(), role: element.getAttribute("role"), testid: clean(element.getAttribute("data-testid")), classes: clean(element.getAttribute("class")), match: /timeplan|timetable|schedule|lesson|frav[æa]|absence|assignment|oppgave/i.test(element.textContent ?? "") ? "relevant_label" : "other" }));
    const counts = Object.fromEntries(["[role=log]", "[data-testid]", "[class*=timetable i]", "[class*=schedule i]", "[class*=lesson i]", "[class*=absence i]", "[class*=frav i]"].map(selector => [selector, document.querySelectorAll(selector).length]));
    const item = document.querySelector(".Timetable-TimetableItem");
    const hierarchy = []; let ancestor = item;
    for (let index = 0; index < 6 && ancestor; index++, ancestor = ancestor.parentElement) hierarchy.push({ tag: ancestor.tagName.toLowerCase(), classes: clean(ancestor.getAttribute("class")), attributes: [...ancestor.attributes].map(attribute => attribute.name).filter(name => !["class", "style"].includes(name)) });
    const headings = [...document.querySelectorAll(".Timetable-TimetableHeader-day, .Timetable-TimetableDays_day, .TimetableDaySelector_cell")].slice(0, 15).map(element => ({ classes: clean(element.getAttribute("class")), attributes: [...element.attributes].map(attribute => attribute.name).filter(name => !["class", "style"].includes(name)), children: [...element.children].slice(0, 5).map(child => clean(child.getAttribute("class"))) }));
    const itemProperties = item ? {
      unixLength: (item.getAttribute("starttimeanddateunix") ?? "").length,
      hasFutureAbsence: item.getAttribute("hasfutureabsence"),
      timetableType: item.getAttribute("tttype"),
      childClasses: [...item.querySelectorAll("[class]")].slice(0, 15).map(child => clean(child.getAttribute("class"))),
      hoursPattern: (item.querySelector(".Timetable-TimetableItem-hours")?.textContent ?? "").replace(/[0-9]/g, "#").replace(/[A-Za-zÀ-ž]/g, "x"),
    } : null;
    return { counts, shape, hierarchy, headings, itemProperties };
  })()`);
  console.log(JSON.stringify({ provider, origin: new URL(page.url()).origin, tabCount: browser.contexts().reduce((count, context) => count + context.pages().length, 0), structure }));
  }
  }
} finally {
  await browser.close();
}
