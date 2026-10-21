import type { Note } from "@sorta/contracts";

export function watchBrainNotes(load: () => Promise<Note[]>, publish: (notes: Note[]) => void, failed: (error: unknown) => void) {
  let stopped = false;
  let loading = false;
  const refresh = async () => {
    if (stopped || loading) return;
    loading = true;
    try { const notes = await load(); if (!stopped) publish(notes); }
    catch (error) { if (!stopped) failed(error); }
    finally { loading = false; }
  };
  const visibleRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
  const timer = window.setInterval(visibleRefresh, 30_000);
  document.addEventListener("visibilitychange", visibleRefresh);
  void refresh();
  return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", visibleRefresh); };
}
