import { describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { createSchoolWeatherLoader, parseSchoolWeather, registerSchoolWeatherRoutes } from "./school-weather.js";

const instant = Date.parse("2026-10-16T12:00:00Z");
function response() {
  return { hourly: { time: Array.from({ length: 72 }, (_, i) => (instant - 12 * 3600000) / 1000 + i * 3600),
    temperature_2m: Array(72).fill(6), apparent_temperature: Array(72).fill(4), precipitation_probability: Array(72).fill(30),
    wind_speed_10m: Array(72).fill(3), weather_code: Array(72).fill(61), is_day: Array(72).fill(1) } };
}
describe("school weather", () => {
  it("preserves missing values and uses UTC instants", () => {
    const raw = response(); raw.hourly.temperature_2m[0] = null;
    const result = parseSchoolWeather(raw, instant);
    expect(result.location).toBe("Rasta, Lørenskog");
    expect(result.hours[0].time).toBe("2026-10-16T00:00:00.000Z");
    expect(result.hours[0].temperature).toBeNull();
  });
  it("rejects malformed, mismatched, non-hourly and expired responses", () => {
    const raw = response(); raw.hourly.weather_code.pop();
    expect(() => parseSchoolWeather(raw, instant)).toThrow();
    const gap = response(); gap.hourly.time[1]++;
    expect(() => parseSchoolWeather(gap, instant)).toThrow();
    expect(() => parseSchoolWeather(response(), instant + 5 * 86400000)).toThrow();
    const bad = response(); bad.hourly.precipitation_probability[0] = 200;
    expect(() => parseSchoolWeather(bad, instant)).toThrow();
  });
  it("coalesces requests, caches 20 minutes, labels stale data and expires it", async () => {
    let clock = instant;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(response())));
    const load = createSchoolWeatherLoader(fetcher, () => clock);
    const results = await Promise.all([load(), load()]);
    expect(results[0]).toEqual(results[1]); expect(fetcher).toHaveBeenCalledTimes(1);
    await load(); expect(fetcher).toHaveBeenCalledTimes(1);
    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain("latitude=59.91882"); expect(url).toContain("wind_speed_unit=ms");
    fetcher.mockRejectedValue(new Error("offline"));
    clock += 21 * 60000;
    expect((await load()).stale).toBe(true);
    await load(); expect(fetcher).toHaveBeenCalledTimes(2);
    clock += 40 * 60000;
    await expect(load()).rejects.toThrow("weather_unavailable");
  });
  it("returns a recoverable 503 instead of invented weather", async () => {
    const app = Fastify(); registerSchoolWeatherRoutes(app, async () => { throw new Error("offline"); });
    const result = await app.inject("/api/v1/vaults/test/school/weather");
    expect(result.statusCode).toBe(503); expect(result.json()).toEqual({ error: "weather_unavailable" });
    expect(result.headers["cache-control"]).toBe("no-store"); await app.close();
  });
});
