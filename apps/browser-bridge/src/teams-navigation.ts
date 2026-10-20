import type { Page } from "playwright-core";

const navigationNames = {
  assignments: /^(Assignments|Oppgaver)(?:\s+\(Ctrl\+Shift\+\d+\))?$/i,
  teams: /^(Teams|Team)(?:\s+\(Ctrl\+Shift\+\d+\))?$/i,
  chat: /^Chat(?:\s+\(Ctrl\+Shift\+\d+\))?$/i,
};

export async function openTeamsNavigation(page: Page, section: keyof typeof navigationNames) {
  const url = new URL(page.url());
  if (url.protocol !== "https:" || !["teams.microsoft.com", "teams.cloud.microsoft"].includes(url.hostname)) {
    throw new Error("teams_navigation_left_registered_origin");
  }
  // App-rail buttons have an explicit role; per-class assignment shortcuts do not.
  const button = page.getByRole("button", { name: navigationNames[section] }).and(page.locator('button[role="button"]'));
  await button.first().waitFor({ state: "visible", timeout: 25_000 });
  if (await button.count() !== 1) throw new Error(`teams_${section}_navigation_ambiguous`);
  await button.click({ timeout: 15_000 });
}
