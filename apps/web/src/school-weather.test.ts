import { describe, expect, it } from "vitest";
import type { CalendarView, SchoolWeather } from "@sorta/contracts";
import { forecastForSlot, schoolWeatherSlots, weatherCondition, weatherTime } from "./school-weather";

const now = new Date("2026-10-16T06:00:00Z");
const calendar = { occurrences: [], overlayItems: [
  { kind: "lesson", startsAt: "2026-10-16T06:15:00Z", endsAt: "2026-10-16T07:00:00Z" },
  { kind: "lesson", startsAt: "2026-10-16T12:00:00Z", endsAt: "2026-10-16T13:30:00Z" },
  { kind: "assignment", startsAt: "2026-10-16T21:59:00Z", endsAt: null },
  { kind: "lesson", startsAt: "2026-10-17T06:00:00Z", endsAt: "2026-10-17T16:00:00Z" },
] } as unknown as CalendarView;
describe("school-day weather display", () => {
  it("uses only today's lessons, not deadlines or tomorrow's classes", () => {
    const result = schoolWeatherSlots(calendar, now);
    expect(result.basis).toBe("timetable");
    expect(result.slots.map(slot => slot.time)).toEqual(["2026-10-16T05:45:00.000Z", "2026-10-16T13:30:00.000Z"]);
    expect(weatherTime(result.slots[0].time!)).toBe("07:45");
  });
  it("labels missing timetable times as morning and afternoon, not confirmed school times", () => {
    const result = schoolWeatherSlots(null, now);
    expect(result.basis).toBe("fallback"); expect(result.slots[0].label).toBe("Morning");
    expect(result.slots[1].localHour).toBe("16:00");
  });
  it("does not substitute distant forecast hours or turn null into zero", () => {
    const hours = [{ time: "2026-10-16T06:00:00Z", temperature: null }] as SchoolWeather["hours"];
    expect(forecastForSlot(hours, { time: "2026-10-16T05:45:00Z", localHour: null }, now)?.temperature).toBeNull();
    expect(forecastForSlot(hours, { time: "2026-10-16T13:30:00Z", localHour: null }, now)).toBeNull();
  });
  it("uses Oslo time through daylight-saving changes", () => {
    expect(weatherTime("2026-10-25T00:00:00Z")).toBe("02:00");
    expect(weatherTime("2026-10-25T01:00:00Z")).toBe("02:00");
  });
  it.each([[0, "sun"], [2, "cloudSun"], [3, "cloud"], [45, "fog"], [51, "drizzle"],
    [61, "rain"], [66, "sleet"], [75, "snow"], [95, "thunder"], [null, "unknown"], [999, "unknown"]])("maps weather %s to %s", (code, icon) => {
    expect(weatherCondition(code as number | null, true).icon).toBe(icon);
  });
  it("uses night icons rather than a sun in darkness", () => {
    expect(weatherCondition(0, false).icon).toBe("moon");
    expect(weatherCondition(2, false).icon).toBe("cloudMoon");
  });
});
