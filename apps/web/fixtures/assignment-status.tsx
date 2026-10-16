import { createRoot } from "react-dom/client";
import { CalendarTimeline } from "../src/CalendarTimeline";
import type { TimelineItem } from "../src/calendar-timeline";
import "../src/styles.css";

const days = [new Date("2026-10-16T10:00:00Z")];
const items: TimelineItem[] = (["submitted", "missing", "submitted_late", "pending", "unknown"] as const).map(status => ({
  id: status, title: `Test assignment: ${status.replaceAll("_", " ")}`, startsAt: "2026-10-16T21:59:00Z", endsAt: null,
  layer: "deadline", attendanceStatus: null, attendanceLabel: null, detail: "Synthetic test data",
  submission: { status, observedAt: "2026-10-16T12:00:00Z" },
}));
createRoot(document.getElementById("root")!).render(<main style={{ padding: "16px", maxWidth: "1000px", margin: "auto" }}>
  <h1>Assignment status test</h1><p>Synthetic assignments only. No school records changed.</p>
  <section className="calendar-projection"><CalendarTimeline days={days} items={items} markers={[]} timezone="Europe/Oslo"/></section>
</main>);
