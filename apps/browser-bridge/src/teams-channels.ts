import { createHash } from "node:crypto";
import type { Page } from "playwright-core";
import { openTeamsNavigation } from "./teams-navigation.js";

type Note = { id: string; title: string; body: string; path: string };
type RenderedPost = { messageId: string; chainId: string; text: string; isReply: boolean };

export function mergeRenderedPosts(existing: Map<string, RenderedPost>, posts: RenderedPost[]): void {
  for (const post of posts) {
    if (!post.messageId || !post.chainId) throw new Error("teams_channel_post_identity_missing");
    const key = `${post.chainId}:${post.messageId}`;
    const previous = existing.get(key);
    if (previous && previous.isReply !== post.isReply) throw new Error("teams_channel_reply_identity_changed");
    if (!previous || post.text.length > previous.text.length) existing.set(key, post);
  }
}

async function collectRenderedChannelHistory(probe: Page): Promise<RenderedPost[]> {
  const viewport = probe.locator('[data-tid="channel-pane-viewport"]');
  await viewport.waitFor({ state: "attached", timeout: 10_000 });
  if (await viewport.count() !== 1) throw new Error("teams_channel_post_viewport_ambiguous");
  const posts = new Map<string, RenderedPost>();
  let stableTop = 0, lastHeight = -1, lastCount = -1;
  for (let step = 0; step < 30; step++) {
    const snapshot = await viewport.evaluate(element => ({
      top: element.scrollTop,
      height: element.scrollHeight,
      client: element.clientHeight,
      posts: [...document.querySelectorAll<HTMLElement>('[data-reply-chain-id][data-mid]')].map(post => ({
        messageId: post.getAttribute("data-mid") ?? "",
        chainId: post.getAttribute("data-reply-chain-id") ?? "",
        text: (post.closest<HTMLElement>('[role="group"]')?.innerText ?? post.innerText).replace(/\s+\n/g, "\n").replace(/\nReply\s*$/i, "").trim(),
        isReply: Boolean(post.closest('[data-tid="response-surface"]')),
      })),
    }));
    mergeRenderedPosts(posts, snapshot.posts);
    if (posts.size > 500) throw new Error("teams_channel_post_count_exceeds_import_limit");
    if (snapshot.top === 0 && snapshot.height === lastHeight && posts.size === lastCount) stableTop++;
    else stableTop = 0;
    if (stableTop >= 3) return [...posts.values()];
    lastHeight = snapshot.height;
    lastCount = posts.size;
    await viewport.evaluate(element => { element.scrollTop = Math.max(0, element.scrollTop - Math.floor(element.clientHeight * 0.8)); });
    await probe.waitForTimeout(snapshot.top === 0 ? 1_500 : 500);
  }
  throw new Error("teams_channel_history_scroll_limit");
}

export function teamsChannelPostNote(className: string, channelName: string, post: RenderedPost): Note {
  if (!className.trim() || !channelName.trim() || !post.messageId || !post.chainId || !post.text.trim()) throw new Error("teams_channel_post_identity_invalid");
  const general = /^(General|Generelt)$/.test(channelName);
  // Keep existing General identities and titles so broadening the scan updates,
  // rather than duplicates, records that were already imported.
  const id = createHash("sha256").update(general
    ? `teams-channel:${className}:${post.chainId}:${post.messageId}`
    : `teams-channel:${className}:${channelName}:${post.chainId}:${post.messageId}`).digest("hex");
  const title = general
    ? `Teams · ${className.slice(0, 150)} · ${id.slice(0, 12)}`
    : `Teams · ${className.slice(0, 100)} · ${channelName.slice(0, 80)} · ${id.slice(0, 12)}`;
  const body = `Source: Teams class channel post\nClass: ${className}\nChannel: ${general ? "General" : channelName}\nMessage kind: ${post.isReply ? "reply" : "post"}\nRead-only browser capture; check Teams for later changes.\n\n${post.text}`;
  if (Buffer.byteLength(body) > 1_000_000) throw new Error("teams_channel_post_too_large");
  return { id, title, body, path: `teams/channels/${id}.json` };
}

export async function collectTeamsClassPosts(source: Page): Promise<{ notes: Note[]; coverage: { classes: number; channels: number; posts: number; replies: number; emptyPosts: number; complete: false; limitation: string } }> {
  const context = source.context();
  const notes: Note[] = [];
  let classCount = 0, channelCount = 0, emptyPosts = 0, replyCount = 0;
  const probe = await context.newPage();
  try {
    await probe.goto(source.url(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    await openTeamsNavigation(probe, "teams");
    const classes = probe.locator(".fui-AccordionItem").filter({ hasText: /Classes\s*\d+\s*teams/i });
    await classes.waitFor({ timeout: 20_000 });
    if (await classes.count() !== 1) throw new Error("teams_classes_accordion_ambiguous");
    const header = classes.locator(".fui-AccordionHeader__button");
    if (await header.count() !== 1) throw new Error("teams_classes_header_ambiguous");
    if (await header.getAttribute("aria-expanded") === "false") await header.click();
    const cards = classes.locator('[role="group"]');
    await cards.first().waitFor({ timeout: 15_000 });
    classCount = await cards.count();
    if (classCount < 1 || classCount > 30) throw new Error("teams_class_card_count_unbounded");
    for (let index = 0; index < classCount; index++) {
      const className = (await cards.nth(index).textContent() ?? "").replace(/\s+/g, " ").trim();
      if (!className) throw new Error("teams_class_name_missing");
      await cards.nth(index).click();
      const general = probe.getByRole("treeitem", { name: /^(General|Generelt)$/ });
      await general.waitFor({ timeout: 15_000 });
      if (await general.count() !== 1) throw new Error(`teams_general_channel_ambiguous_class_${index}`);
      const hidden = probe.locator("#single-team-hidden-channels");
      if (await hidden.count() === 1 && await hidden.getAttribute("aria-expanded") === "false") await hidden.click();
      const channels = (await probe.locator('[role="treeitem"][aria-level="2"]').allTextContents()).map(value => value.trim());
      if (!channels.some(value => /^(General|Generelt)$/.test(value)) || channels.length > 100 || new Set(channels).size !== channels.length) throw new Error(`teams_channel_list_ambiguous_class_${index}`);
      for (const [channelIndex, channelName] of channels.entries()) {
        channelCount++;
        const channel = probe.getByRole("treeitem", { name: channelName, exact: true });
        if (await channel.count() !== 1) throw new Error("teams_channel_changed");
        await channel.click();
        await probe.waitForFunction(name => [...document.querySelectorAll<HTMLElement>('[role="treeitem"][aria-level="2"]')]
          .some(item => (item.textContent ?? "").trim() === name && item.getAttribute("aria-selected") === "true"), channelName, { timeout: 10_000 });
        await probe.waitForTimeout(1_500);
        const posts = await collectRenderedChannelHistory(probe).catch(error => {
          const code = error instanceof Error && /^teams_[a-z0-9_]{1,80}$/.test(error.message) ? error.message : "teams_channel_history_failed";
          throw new Error(`${code}_class_${index}_channel_${channelIndex}`);
        });
        for (const post of posts) {
          if (!post.text) { emptyPosts++; continue; }
          notes.push(teamsChannelPostNote(className, channelName, post));
          if (post.isReply) replyCount++;
          if (notes.length > 500) throw new Error("teams_channel_post_count_exceeds_import_limit");
        }
      }
      await probe.getByText("All teams", { exact: true }).click();
      await cards.first().waitFor({ timeout: 15_000 });
    }
  } finally { await probe.close(); }
  const unique = [...new Map(notes.map(note => [note.id, note])).values()];
  if (!unique.length) throw new Error("teams_channel_posts_not_found_layout_review_required");
  if (unique.length > 500) throw new Error("teams_channel_post_count_exceeds_import_limit");
  return { notes: unique, coverage: { classes: classCount, channels: channelCount, posts: unique.length, replies: replyCount, emptyPosts, complete: false, limitation: "Messages rendered while scrolling each class channel to the top were captured, including identified rendered replies. Server-side history beyond the loaded feed, collapsed or unloaded replies, empty-text attachments, classwork, and private chats require separate coverage." } };
}
