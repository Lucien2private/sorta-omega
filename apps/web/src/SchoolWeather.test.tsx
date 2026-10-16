// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { SchoolWeather } from "./SchoolWeather";

vi.mock("./api", () => ({ api: { schoolWeather: vi.fn() } }));
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount());
  document.body.replaceChildren(); vi.restoreAllMocks();
});
async function render() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host); roots.push(root);
  await act(async () => root.render(createElement(SchoolWeather, { calendar: null })));
  return host;
}
describe("school weather states", () => {
  it("announces loading while the forecast is pending", async () => {
    vi.mocked(api.schoolWeather).mockReturnValue(new Promise(() => {}));
    expect((await render()).querySelector('[role="status"]')?.textContent).toContain("Loading");
  });
  it("shows an automatic-retry message on failure without invented temperatures", async () => {
    vi.mocked(api.schoolWeather).mockRejectedValue(new Error("offline"));
    const host = await render();
    expect(host.textContent).toContain("retry automatically");
    expect(host.textContent).not.toContain("°C");
  });
  it("labels stale data and unavailable slots", async () => {
    vi.mocked(api.schoolWeather).mockResolvedValue({ location: "Rasta, Lørenskog", fetchedAt: new Date().toISOString(), stale: true, hours: [] });
    const host = await render();
    expect(host.textContent).toContain("Earlier forecast");
    expect(host.textContent).toContain("No timed classes imported");
    expect(host.textContent).toContain("Forecast unavailable for this time");
    expect(host.querySelector("a")?.href).toBe("https://open-meteo.com/");
  });
});
