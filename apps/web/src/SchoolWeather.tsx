import { useEffect, useState } from "react";
import type { CalendarView, SchoolWeather as Forecast } from "@sorta/contracts";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, CloudHail, CircleHelp, Moon, Sun } from "lucide-react";
import { api } from "./api";
import { forecastForSlot, schoolWeatherSlots, weatherCondition, weatherDate, weatherTime } from "./school-weather";
import "./school-weather.css";

const icons = { sun: Sun, moon: Moon, cloudSun: CloudSun, cloudMoon: CloudMoon, cloud: Cloud, drizzle: CloudDrizzle,
  fog: CloudFog, rain: CloudRain, snow: CloudSnow, sleet: CloudHail, thunder: CloudLightning, unknown: CircleHelp };
const temperature = (value: number | null) => value === null ? "Unavailable" : `${Math.round(value)} °C`;

export function SchoolWeather({ calendar }: { calendar: CalendarView | null }) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const data = await api.schoolWeather(); if (active) { setForecast(data); setState("ready"); } }
      catch { if (active) { setForecast(null); setState("error"); } }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15 * 60_000);
    const clock = window.setInterval(() => setNow(new Date()), 60_000);
    const visible = () => { if (document.visibilityState === "visible") { setNow(new Date()); void load(); } };
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; window.clearInterval(timer); window.clearInterval(clock); document.removeEventListener("visibilitychange", visible); };
  }, []);
  const { basis, slots } = schoolWeatherSlots(calendar, now);
  return <section className="school-weather" aria-label="School-day weather">
    <header><h2>School-day weather</h2><span>{forecast?.location ?? "Rasta, Lørenskog"}</span></header>
    {state !== "ready" || !forecast ? <p role="status">{state === "error" ? "Weather is temporarily unavailable. It will retry automatically." : "Loading the school-day forecast…"}</p> : <>
      <p className="weather-date">{new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "long", day: "numeric", month: "long" }).format(now)}</p>
      <div className="weather-periods">{slots.map(slot => {
        const hour = forecastForSlot(forecast.hours, slot, now);
        const condition = weatherCondition(hour?.code ?? null, hour?.isDay ?? null);
        const Icon = icons[condition.icon as keyof typeof icons];
        return <article key={slot.label}>
          <h3>{slot.label} <time dateTime={slot.time ?? undefined}>{slot.time ? weatherTime(slot.time) : slot.localHour}</time></h3>
          {hour ? <><div className="weather-main"><Icon size={30} aria-hidden="true"/><strong>{temperature(hour.temperature)}</strong><span>{condition.label}</span></div>
            <p>Feels like {temperature(hour.feelsLike)}<br/>{hour.precipitationProbability === null ? "Rain chance unavailable" : `${Math.round(hour.precipitationProbability)}% precipitation chance`}<br/>{hour.wind === null ? "Wind unavailable" : `Wind ${hour.wind.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} m/s`}</p>
            <small>Hourly forecast at {weatherTime(hour.time)}</small></> : <p>Forecast unavailable for this time.</p>}
        </article>;
      })}</div>
      <footer>{basis === "timetable" ? "30 minutes before your first class, and at your last class’s end. " : "No timed classes imported for today. Showing 07:00 and 16:00. "}
        {forecast.stale && <strong>Earlier forecast; refresh delayed. </strong>}
        Retrieved {weatherDate(forecast.fetchedAt) === weatherDate(now) ? "" : `${weatherDate(forecast.fetchedAt)} `}{weatherTime(forecast.fetchedAt)}. <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather: Open-Meteo</a>
      </footer>
    </>}
  </section>;
}
