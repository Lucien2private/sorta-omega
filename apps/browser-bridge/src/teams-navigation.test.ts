import { describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import { openTeamsNavigation } from "./teams-navigation.js";

function fixture(labels: Array<{ label: string; explicitRole: boolean }>, origin = "https://teams.cloud.microsoft/") {
  let name: RegExp;
  let scoped = false;
  const click = vi.fn(async () => undefined);
  const matches = () => labels.filter(item => name.test(item.label) && (!scoped || item.explicitRole));
  const locator = { and: vi.fn(() => { scoped = true; return locator; }), first: () => locator,
    waitFor: vi.fn(async () => { if (!matches().length) throw new Error("not_visible"); }),
    count: async () => matches().length, click };
  const page = { url: () => origin,
    getByRole: vi.fn((_role, options) => { name = options.name; return locator; }),
    locator: vi.fn(() => locator) } as unknown as Page;
  return { page, click };
}

describe("Teams app-rail navigation", () => {
  it.each(["Assignments", "Assignments (Ctrl+Shift+4)", "Assignments (Ctrl+Shift+6)", "Oppgaver"])("accepts %s without choosing a class shortcut", async label => {
    const { page, click } = fixture([{ label, explicitRole: true }, ...Array(7).fill({ label: "Assignments", explicitRole: false })]);
    await openTeamsNavigation(page, "assignments"); expect(click).toHaveBeenCalledOnce();
  });
  it.each(["Teams", "Teams (Ctrl+Shift+5)"])("opens %s", async label => {
    const { page, click } = fixture([{ label, explicitRole: true }]);
    await openTeamsNavigation(page, "teams"); expect(click).toHaveBeenCalledOnce();
  });
  it("opens Chat without a keyboard shortcut in its label", async () => {
    const { page, click } = fixture([{ label: "Chat", explicitRole: true }]);
    await openTeamsNavigation(page, "chat"); expect(click).toHaveBeenCalledOnce();
  });
  it("rejects ambiguous global navigation without clicking", async () => {
    const { page, click } = fixture(Array(2).fill({ label: "Assignments", explicitRole: true }));
    await expect(openTeamsNavigation(page, "assignments")).rejects.toThrow("navigation_ambiguous");
    expect(click).not.toHaveBeenCalled();
  });
  it("rejects missing navigation and unregistered origins", async () => {
    const { page, click } = fixture([{ label: "Assignments", explicitRole: false }]);
    await expect(openTeamsNavigation(page, "assignments")).rejects.toThrow(); expect(click).not.toHaveBeenCalled();
    await expect(openTeamsNavigation(fixture([], "https://login.microsoftonline.com/").page, "assignments")).rejects.toThrow("registered_origin");
  });
});
