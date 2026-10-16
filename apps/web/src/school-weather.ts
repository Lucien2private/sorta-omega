import type { CalendarView, SchoolWeather } from "@sorta/contracts";

export const weatherDate = (time: Date | string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(new Date(time));
export const weatherTime = (time: Date | string) => new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(time));

export function schoolWeatherSlots(calendar: CalendarView | null, now: Date) {
  const date = weatherDate(now);
  const lessons = calendar ? [...calendar.occurrences.filter(item => item.layer === "school"),
    ...calendar.overlayItems.filter(item => item.kind === "lesson")]
    .filter(item => item.endsAt && weatherDate(item.startsAt) === date && Date.parse(item.endsAt) > Date.parse(item.startsAt)) : [];
  const starts = lessons.map(item => Date.parse(item.startsAt));
  const ends = lessons.map(item => Date.parse(item.endsAt!));
  if (!lessons.length) return { basis: "fallback" as const, slots: [
    { label: "Morning", localHour: "07:00" }, { label: "Afternoon", localHour: "16:00" },
  ].map(item => ({ label: item.label, time: null, localHour: item.localHour })) };
  return { basis: "timetable" as const, slots: [
    { label: "Before school", time: new Date(Math.min(...starts) - 30 * 60_000).toISOString(), localHour: null },
    { label: "After school", time: new Date(Math.max(...ends)).toISOString(), localHour: null },
  ] };
}

export function forecastForSlot(hours: SchoolWeather["hours"], slot: { time: string | null; localHour: string | null }, now: Date) {
  if (!slot.time) return hours.find(hour => weatherDate(hour.time) === weatherDate(now) && weatherTime(hour.time) === slot.localHour) ?? null;
  const nearest = hours.reduce<SchoolWeather["hours"][number] | null>((best, hour) =>
    !best || Math.abs(Date.parse(hour.time) - Date.parse(slot.time!)) < Math.abs(Date.parse(best.time) - Date.parse(slot.time!)) ? hour : best, null);
  return nearest && Math.abs(Date.parse(nearest.time) - Date.parse(slot.time)) <= 30 * 60_000 ? nearest : null;
}

export function weatherCondition(code: number | null, isDay: boolean | null) {
  if (code === 0 || code === 1) return { icon: isDay === false ? "moon" : "sun", label: code === 0 ? "Clear" : "Mainly clear" };
  if (code === 2) return { icon: isDay === false ? "cloudMoon" : "cloudSun", label: "Partly cloudy" };
  if (code === 3) return { icon: "cloud", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "fog", label: "Fog" };
  if ([51, 53, 55].includes(code!)) return { icon: "drizzle", label: "Drizzle" };
  if ([56, 57, 66, 67].includes(code!)) return { icon: "sleet", label: "Freezing rain / drizzle" };
  if ([61, 63, 65, 80, 81, 82].includes(code!)) return { icon: "rain", label: [65, 82].includes(code!) ? "Heavy rain" : "Rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code!)) return { icon: "snow", label: "Snow" };
  if ([95, 96, 97, 99].includes(code!)) return { icon: "thunder", label: [96, 99].includes(code!) ? "Thunderstorm with hail" : "Thunderstorm" };
  return { icon: "unknown", label: "Conditions unavailable" };
}
