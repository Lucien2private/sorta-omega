import type { FastifyInstance } from "fastify";
import { schoolWeatherSchema, type SchoolWeather } from "@sorta/contracts";
import { z } from "zod";

// Town-level coordinates, selected by the owner. No device location is sent.
const location = { name: "Rasta, Lørenskog", latitude: 59.91882, longitude: 10.95436 };
const values = z.array(z.number().finite().nullable());
const upstreamSchema = z.object({ hourly: z.object({
  time: z.array(z.number().int().positive()),
  temperature_2m: values,
  apparent_temperature: values,
  precipitation_probability: z.array(z.number().min(0).max(100).nullable()),
  wind_speed_10m: z.array(z.number().nonnegative().nullable()),
  weather_code: z.array(z.number().int().nullable()),
  is_day: z.array(z.union([z.literal(0), z.literal(1)]).nullable()),
}) });

export function parseSchoolWeather(raw: unknown, now: number): SchoolWeather {
  const { hourly: h } = upstreamSchema.parse(raw);
  if (h.time.length < 24 || h.time.length > 240 || Object.values(h).some(v => v.length !== h.time.length)
    || h.time.some((time, index) => index > 0 && time - h.time[index - 1] !== 3600)
    || h.time[0] * 1000 > now || h.time.at(-1)! * 1000 < now) throw new Error("weather_response_invalid");
  return schoolWeatherSchema.parse({ location: location.name, fetchedAt: new Date(now).toISOString(), stale: false,
    hours: h.time.map((time, i) => ({ time: new Date(time * 1000).toISOString(), temperature: h.temperature_2m[i],
      feelsLike: h.apparent_temperature[i], precipitationProbability: h.precipitation_probability[i],
      wind: h.wind_speed_10m[i], code: h.weather_code[i], isDay: h.is_day[i] === null ? null : h.is_day[i] === 1 })) });
}

export function createSchoolWeatherLoader(fetcher: typeof fetch = fetch, now = Date.now) {
  let cache: SchoolWeather | null = null;
  let pending: Promise<SchoolWeather> | null = null;
  let retryAfter = 0;
  return async (): Promise<SchoolWeather> => {
    const age = cache ? now() - Date.parse(cache.fetchedAt) : Infinity;
    if (cache && age >= 0 && age < 20 * 60_000) return cache;
    if (now() < retryAfter) {
      if (cache && age >= 0 && age < 60 * 60_000) return { ...cache, stale: true };
      throw new Error("weather_unavailable");
    }
    if (pending) return pending;
    pending = (async () => {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.search = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude),
          hourly: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day",
          wind_speed_unit: "ms", timeformat: "unixtime", timezone: "Europe/Oslo", forecast_days: "3" }).toString();
        const response = await fetcher(url, { signal: AbortSignal.timeout(10_000), redirect: "error" });
        if (!response.ok) throw new Error("weather_upstream_failed");
        cache = parseSchoolWeather(await response.json(), now());
        return cache;
      } catch {
        retryAfter = now() + 60_000;
        if (cache && age >= 0 && age < 60 * 60_000) return { ...cache, stale: true };
        throw new Error("weather_unavailable");
      } finally { pending = null; }
    })();
    return pending;
  };
}

export function registerSchoolWeatherRoutes(app: FastifyInstance, load = createSchoolWeatherLoader()) {
  app.get("/api/v1/vaults/:vaultId/school/weather", async (_request, reply) => {
    reply.header("cache-control", "no-store");
    try { return await load(); }
    catch { return reply.code(503).send({ error: "weather_unavailable" }); }
  });
}
