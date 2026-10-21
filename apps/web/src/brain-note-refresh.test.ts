// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { watchBrainNotes } from "./brain-note-refresh";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("hands-off Brain refresh", () => {
  it("loads immediately and refreshes every 30 seconds while visible", async () => {
    vi.useFakeTimers(); vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const load = vi.fn().mockResolvedValue([]), publish = vi.fn();
    const stop = watchBrainNotes(load, publish, vi.fn());
    await vi.advanceTimersByTimeAsync(0); expect(publish).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30_000); expect(load).toHaveBeenCalledTimes(2); expect(publish).toHaveBeenCalledTimes(2);
    stop(); await vi.advanceTimersByTimeAsync(60_000); expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not overlap requests or publish a late result after leaving the screen", async () => {
    vi.useFakeTimers(); vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    let finish!: (notes: []) => void;
    const load = vi.fn(() => new Promise<[]>(resolve => { finish = resolve; })), publish = vi.fn();
    const stop = watchBrainNotes(load, publish, vi.fn());
    await vi.advanceTimersByTimeAsync(60_000); expect(load).toHaveBeenCalledOnce();
    stop(); finish([]); await vi.advanceTimersByTimeAsync(0); expect(publish).not.toHaveBeenCalled();
  });
  it("pauses hidden-tab polling and refreshes on return", async () => {
    vi.useFakeTimers(); const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const load = vi.fn().mockResolvedValue([]), stop = watchBrainNotes(load, vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(60_000); expect(load).toHaveBeenCalledOnce();
    visibility.mockReturnValue("visible"); document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0); expect(load).toHaveBeenCalledTimes(2); stop();
  });
  it("reports a failure then retries automatically without clearing successful data", async () => {
    vi.useFakeTimers(); vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const error = new Error("unavailable");
    const load = vi.fn().mockRejectedValueOnce(error).mockResolvedValue([]), failed = vi.fn(), publish = vi.fn();
    const stop = watchBrainNotes(load, publish, failed);
    await vi.advanceTimersByTimeAsync(0); expect(failed).toHaveBeenCalledWith(error);
    await vi.advanceTimersByTimeAsync(30_000); expect(publish).toHaveBeenCalledWith([]); stop();
  });
});
