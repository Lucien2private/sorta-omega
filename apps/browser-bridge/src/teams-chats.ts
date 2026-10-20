import { createHash } from "node:crypto";
import type { Page } from "playwright-core";
import { openTeamsNavigation } from "./teams-navigation.js";

type RenderedMessage = { id: string; text: string };
type Note = { id: string; title: string; body: string; path: string };

export function mergeRenderedMessages(existing: Map<string, RenderedMessage>, messages: RenderedMessage[]): void {
  for (const message of messages) {
    if (!message.id) throw new Error("teams_chat_message_identity_missing");
    const previous = existing.get(message.id);
    if (!previous || message.text.length > previous.text.length) existing.set(message.id, message);
  }
}

export function teamsChatNameFromRow(rowText: string): string {
  const name = rowText.split(/\n+/).map(value => value.trim()).find(Boolean) ?? "";
  if (!name || name.length > 180) throw new Error("teams_chat_name_missing_or_unbounded");
  return name;
}

export function teamsChatNote(conversationKey: string, conversationName: string, messages: RenderedMessage[]): Note {
  if (!conversationKey || !conversationName.trim() || !messages.length) throw new Error("teams_chat_identity_invalid");
  const id = createHash("sha256").update(`teams-chat:${conversationKey}`).digest("hex");
  const title = `Teams chat · ${conversationName.trim().replace(/\s+/g, " ").slice(0, 180)} · ${id.slice(0, 12)}`;
  const content = messages.filter(message => message.text.trim()).map(message => {
    const messageId = createHash("sha256").update(message.id).digest("hex").slice(0, 16);
    return `[${messageId}] ${message.text.trim()}`;
  }).join("\n\n");
  if (!content) throw new Error("teams_chat_has_no_text_messages");
  const body = `Source: Teams chat\nConversation: ${conversationName.trim()}\nCaptured from the signed-in browser. This is a partial read-only snapshot; older server history, unloaded content, and attachments may be absent.\n\n${content}`;
  if (Buffer.byteLength(body) > 1_000_000) throw new Error("teams_chat_note_too_large");
  return { id, title, body, path: `teams/chats/${id}.json` };
}

async function collectConversationKeys(probe: Page): Promise<string[]> {
  const rail = probe.locator('[data-tid="simple-collab-dnd-rail"]');
  if (await rail.count() !== 1) throw new Error("teams_chat_list_scroller_ambiguous");
  const keys = new Set<string>();
  let stableBottom = 0;
  for (let step = 0; step < 40; step++) {
    const snapshot = await rail.evaluate(element => ({
      top: element.scrollTop, height: element.scrollHeight, client: element.clientHeight,
      keys: [...element.querySelectorAll<HTMLElement>('[role="treeitem"][data-item-type="chat"], [role="treeitem"][data-item-type="muted-chat"]')].map(item => item.getAttribute("data-fui-tree-item-value") ?? ""),
    }));
    if (snapshot.keys.some(key => !key)) throw new Error("teams_chat_key_missing");
    snapshot.keys.forEach(key => keys.add(key));
    if (keys.size > 200) throw new Error("teams_chat_list_exceeds_bound");
    const atBottom = snapshot.top + snapshot.client >= snapshot.height - 2;
    stableBottom = atBottom ? stableBottom + 1 : 0;
    if (stableBottom >= 3) return [...keys];
    await rail.evaluate(element => { element.scrollTop = Math.min(element.scrollHeight, element.scrollTop + Math.floor(element.clientHeight * 0.8)); });
    await probe.waitForTimeout(atBottom ? 1_000 : 350);
  }
  throw new Error("teams_chat_list_scroll_limit");
}

async function collectConversationMessages(probe: Page): Promise<{ messages: RenderedMessage[]; reachedLoadedTop: boolean }> {
  const viewport = probe.locator('[data-tid="message-pane-list-viewport"]');
  await viewport.waitFor({ state: "attached", timeout: 15_000 });
  if (await viewport.count() !== 1) throw new Error("teams_chat_message_scroller_ambiguous");
  const messages = new Map<string, RenderedMessage>();
  let stableTop = 0, lastHeight = -1, lastCount = -1;
  for (let step = 0; step < 25; step++) {
    const snapshot = await viewport.evaluate(element => ({
      top: element.scrollTop, height: element.scrollHeight, client: element.clientHeight,
      messages: [...element.querySelectorAll<HTMLElement>('[data-tid="chat-pane-message"][data-mid]')].map(message => ({
        id: message.getAttribute("data-mid") ?? "",
        text: (message.querySelector<HTMLElement>('[data-message-content]')?.innerText ?? "").trim(),
      })),
    }));
    mergeRenderedMessages(messages, snapshot.messages);
    if (messages.size > 5_000) throw new Error("teams_chat_message_count_exceeds_bound");
    if (snapshot.top === 0 && snapshot.height === lastHeight && messages.size === lastCount) stableTop++;
    else stableTop = 0;
    if (stableTop >= 3) return { messages: [...messages.values()], reachedLoadedTop: true };
    lastHeight = snapshot.height;
    lastCount = messages.size;
    await viewport.evaluate(element => { element.scrollTop = Math.max(0, element.scrollTop - Math.floor(element.clientHeight * 0.8)); });
    await probe.waitForTimeout(snapshot.top === 0 ? 1_000 : 350);
  }
  if (!messages.size) throw new Error("teams_chat_messages_not_found");
  return { messages: [...messages.values()], reachedLoadedTop: false };
}

export async function collectTeamsChats(source: Page): Promise<{ notes: Note[]; coverage: { conversations: number; textMessages: number; emptyMessages: number; boundedHistories: number; complete: false; limitation: string } }> {
  const probe = await source.context().newPage();
  const notes: Note[] = [];
  let textMessages = 0, emptyMessages = 0, boundedHistories = 0;
  try {
    await probe.goto(source.url(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!["teams.microsoft.com", "teams.cloud.microsoft"].includes(new URL(probe.url()).hostname)) throw new Error("teams_chat_left_registered_origin");
    await openTeamsNavigation(probe, "chat");
    const row = probe.locator('[role="treeitem"][data-item-type="chat"], [role="treeitem"][data-item-type="muted-chat"]');
    await row.first().waitFor({ timeout: 15_000 });
    const keys = await collectConversationKeys(probe);
    if (!keys.length) throw new Error("teams_chat_list_empty");
    for (const key of keys) {
      const target = probe.locator(`[role="treeitem"][data-fui-tree-item-value=${JSON.stringify(key)}]`);
      if (await target.count() !== 1) throw new Error("teams_chat_row_not_rendered_after_scroll");
      const name = teamsChatNameFromRow(await target.innerText());
      await target.click();
      await probe.waitForTimeout(750);
      const history = await collectConversationMessages(probe);
      const messages = history.messages;
      if (!history.reachedLoadedTop) boundedHistories++;
      emptyMessages += messages.filter(message => !message.text.trim()).length;
      textMessages += messages.filter(message => message.text.trim()).length;
      if (messages.some(message => message.text.trim())) notes.push(teamsChatNote(key, name, messages));
    }
    if (!notes.length) throw new Error("teams_chat_text_not_found_layout_review_required");
    return { notes, coverage: { conversations: keys.length, textMessages, emptyMessages, boundedHistories, complete: false, limitation: "Rendered chat text was captured with a bounded scroll per conversation. Some conversations may have more history than this run reached; Teams may also withhold older server history, hidden chats, collapsed content, and attachment contents." } };
  } finally { await probe.close(); }
}
