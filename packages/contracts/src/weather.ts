import { z } from "zod";

export const schoolWeatherSchema = z.object({
  location: z.string(),
  fetchedAt: z.string().datetime(),
  stale: z.boolean(),
  hours: z.array(z.object({
    time: z.string().datetime(),
    temperature: z.number().nullable(),
    feelsLike: z.number().nullable(),
    precipitationProbability: z.number().min(0).max(100).nullable(),
    wind: z.number().min(0).nullable(),
    code: z.number().int().nullable(),
    isDay: z.boolean().nullable(),
  })),
});
export type SchoolWeather = z.infer<typeof schoolWeatherSchema>;
