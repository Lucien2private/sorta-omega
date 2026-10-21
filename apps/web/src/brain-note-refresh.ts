import type { Note } from "@sorta/contracts";

export function watchBrainNotes(load: () => Promise<Note[]>, publish: (notes: Note[]) => void, failed: (error: unknown) => void, readVersion?: () => Promise<string>) {
  let stopped = false;
  let loading = false;
  let loadedVersion: string | null = null;
  let retry = false;
  const refresh = async () => {
    if (stopped || loading) return;
    loading = true;
    try {
      const version = readVersion ? await readVersion() : null;
      if (stopped || version !== null && version === loadedVersion && !retry) return;
      const notes = await load();
      if (!stopped) { publish(notes); loadedVersion = version; retry = false; }
    }
    catch (error) { retry = true; if (!stopped) failed(error); }
    finally { loading = false; }
  };
  const visibleRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
  const timer = window.setInterval(visibleRefresh, 30_000);
  document.addEventListener("visibilitychange", visibleRefresh);
  void refresh();
  return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", visibleRefresh); };
}
