import type { AssignmentSubmission } from "./AssignmentStatus";

export type TimelineItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  layer: string;
  attendanceStatus: "present" | "absent" | "late" | "unknown" | null;
  attendanceLabel: string | null;
  detail: string;
  submission?: AssignmentSubmission;
};

export type PlacedTimelineItem<T extends TimelineItem> = T & {
  startMinute: number;
  endMinute: number;
  lane: number;
  laneCount: number;
};

export function timelineDateKey(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (name: string) => parts.find(item => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function timelineMinute(value: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(value));
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value ?? 0);
  return part("hour") * 60 + part("minute");
}

export function timelineInitialScrollLeft(dayIndex: number, dayCount: number, scrollWidth: number, clientWidth: number): number {
  if (dayIndex < 0 || dayCount < 1 || scrollWidth <= clientWidth) return 0;
  const hourGutter = 54;
  const dayWidth = (scrollWidth - hourGutter) / dayCount;
  return Math.max(0, dayWidth * dayIndex);
}

export function placeTimelineDay<T extends TimelineItem>(items: T[], date: string, timezone: string): PlacedTimelineItem<T>[] {
  const visible = items.flatMap(item => {
    const endTimestamp = item.endsAt ? Date.parse(item.endsAt) : Date.parse(item.startsAt) + (item.layer === "deadline" ? 60_000 : 30 * 60_000);
    if (!Number.isFinite(endTimestamp) || endTimestamp <= Date.parse(item.startsAt)) return [];
    const startDate = timelineDateKey(item.startsAt, timezone);
    const endDate = timelineDateKey(new Date(endTimestamp - 1).toISOString(), timezone);
    if (date < startDate || date > endDate) return [];
    const startMinute = date === startDate ? timelineMinute(item.startsAt, timezone) : 0;
    const endMinute = date === endDate ? timelineMinute(new Date(endTimestamp).toISOString(), timezone) : 1440;
    return [{ ...item, startMinute, endMinute: Math.max(startMinute + 1, endMinute), lane: 0, laneCount: 1 }];
  }).sort((left, right) => left.startMinute - right.startMinute || right.endMinute - left.endMinute || left.id.localeCompare(right.id));

  let group: typeof visible = [];
  let groupEnd = -1;
  const assignGroup = () => {
    if (!group.length) return;
    const laneEnds: number[] = [];
    for (const item of group) {
      let lane = laneEnds.findIndex(end => end <= item.startMinute);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = item.endMinute;
      item.lane = lane;
    }
    for (const item of group) item.laneCount = laneEnds.length;
  };
  for (const item of visible) {
    if (group.length && item.startMinute >= groupEnd) { assignGroup(); group = []; groupEnd = -1; }
    group.push(item);
    groupEnd = Math.max(groupEnd, item.endMinute);
  }
  assignGroup();
  return visible;
}

export function timelineBounds(days: string[], items: TimelineItem[], timezone: string): { startHour: number; endHour: number } {
  const placed = days.flatMap(date => placeTimelineDay(items, date, timezone));
  const earliest = placed.length ? Math.min(...placed.map(item => item.startMinute)) : 7 * 60;
  const latest = placed.length ? Math.max(...placed.map(item => item.endMinute)) : 21 * 60;
  return { startHour: Math.max(0, Math.min(7, Math.floor(earliest / 60))), endHour: Math.min(24, Math.max(21, Math.ceil(latest / 60))) };
}
