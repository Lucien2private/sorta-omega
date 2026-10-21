// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import type { Note } from "@sorta/contracts";
import { sortedNoteGroups, SortedBrainNotes } from "./SortedBrainNotes";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const note = (id: string, subject: string | null, extra: Partial<Note> = {}): Note => ({
  id, vaultId: "vault", title: id, body: `Imported from pc: Teams/${subject ?? "Other"}/${id}.pdf\n\nContent`, sourceId: id,
  status: "ready", revision: 2, classification: null, classificationLocked: false, suggestedTitle: null, classifiedRevision: null, organizationRevision: 1,
  createdAt: "2026-10-21T07:00:00Z", updatedAt: "2026-10-21T07:00:00Z",
  automaticOrganization: { subject, topic: null, origin: subject ? "source" : "unassigned", evidenceQuote: null, sourceRevision: 2 }, ...extra
});
const render = (notes: Note[], loading = false, incomplete = false) => renderToStaticMarkup(createElement(SortedBrainNotes, { notes, loading, incomplete, renderNote: item => createElement("button", null, item.title) }));
afterEach(() => { document.body.replaceChildren(); });

describe("automatically sorted Brain", () => {
  it("groups all imported notes and owner notes by recorded class", () => {
    expect(sortedNoteGroups([note("a", "Matematikk 2P"), note("b", "Økonomistyring"), note("c", "Matematikk 2P", { sourceId: null })]).map(group => [group.name, group.notes.length])).toEqual([["Matematikk 2P", 2], ["Økonomistyring", 1]]);
  });
  it("does not show stale classification groups after content edits", () => {
    const changed = note("changed", "Matematikk 2P", { revision: 3 });
    expect(sortedNoteGroups([changed])[0].name).toBe("Other files and conversations");
  });
  it("keeps owner notes and unassigned files reachable instead of hiding them", () => {
    expect(sortedNoteGroups([note("file", null), note("owner", null, { sourceId: null })]).map(group => group.name)).toEqual(["Your notes", "Other files and conversations"]);
  });
  it("deduplicates identical originals within a class, not across different classes", () => {
    const hash = "a".repeat(64);
    const html = render([note("first", "Maths", { originalSha256: hash }), note("copy", "Maths", { originalSha256: hash }), note("other", "Norsk", { originalSha256: hash })]);
    expect(html).toContain("2 source locations");
    expect(html).toContain(">copy</button>");
    expect(html).toContain(">other</button>");
    expect(html.match(/1 item</g)).toHaveLength(2);
  });
  it("shows honest loading, failed-load and empty states", () => {
    expect(render([], true)).toContain("Loading all saved notes");
    expect(render([], false, true)).toContain("Could not load all notes");
    expect(render([])).toContain("No saved notes yet");
  });
  it("marks AI topic suggestions and never presents them as original text", () => {
    expect(render([note("a", "Maths", { automaticOrganization: { subject: "Maths", topic: "Prosent", origin: "ai", evidenceQuote: "Prosent", sourceRevision: 2 } })])).toContain("Prosent (AI suggestion)");
  });
  it("filters titles, extracted text and class names and opens matching groups", async () => {
    const container = document.createElement("div"); document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(createElement(SortedBrainNotes, { notes: [note("Algebra deck", "Maths"), note("Norsk essay", "Norsk")], loading: false, incomplete: false, renderNote: item => createElement("button", null, item.title) })); });
    const search = container.querySelector("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(search, "algebra");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.textContent).toContain("Algebra deck");
    expect(container.textContent).not.toContain("Norsk essay");
    expect(container.querySelector("details")?.open).toBe(true);
    await act(async () => { root.unmount(); });
  });
});
