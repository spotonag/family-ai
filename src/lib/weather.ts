import { db } from "@/lib/db";

// BOM's public weather API is unofficial and reverse-engineered — there is
// no supported developer program, so this can break without notice. See
// README.md "Weather data" for details and the fallback behaviour below.
// Location: Boort, VIC 3537. Geohash resolved once via
// https://api.weather.bom.gov.au/v1/locations?search=Boort — hardcoded here
// since it never changes for a fixed location.
const FORECAST_GEOHASH = "r1w4w2z";
const OBSERVATION_GEOHASH = FORECAST_GEOHASH.slice(0, 6);
const BOM_HEADERS = { "User-Agent": "family-ai-app (personal/non-commercial use)" };

const CACHE_ID = "boort";
const FRESH_MS = 15 * 60 * 1000; // re-fetch at most every 15 minutes

export type WeatherData = {
  tempC: number;
  tempMaxC: number | null;
  tempMinC: number | null;
  windKmh: number | null;
  windDirection: string | null;
  rainChance: number | null;
  summary: string;
  iconDescriptor: string | null;
  stale: boolean;
  ageMinutes: number;
};

async function fetchLiveWeather(): Promise<Omit<WeatherData, "stale" | "ageMinutes">> {
  const [dailyRes, obsRes] = await Promise.all([
    fetch(`https://api.weather.bom.gov.au/v1/locations/${FORECAST_GEOHASH}/forecasts/daily`, { headers: BOM_HEADERS }),
    fetch(`https://api.weather.bom.gov.au/v1/locations/${OBSERVATION_GEOHASH}/observations`, { headers: BOM_HEADERS }),
  ]);

  if (!dailyRes.ok || !obsRes.ok) {
    throw new Error(`BOM API error: forecast ${dailyRes.status}, observations ${obsRes.status}`);
  }

  const daily = await dailyRes.json();
  const obs = await obsRes.json();

  const today = daily.data?.[0];
  if (!today) throw new Error("BOM API returned no forecast data");

  const tempC = obs.data?.temp ?? today.now?.temp_now ?? today.temp_max;
  const rainChance = today.rain?.chance ?? null;
  const summaryText = today.extended_text || today.short_text || "No summary available.";
  const summary = `Today: ${today.temp_max}°C, ${summaryText.toLowerCase().replace(/\.$/, "")}${
    rainChance !== null ? `, ${rainChance}% chance of rain` : ""
  }.`;

  return {
    tempC,
    tempMaxC: today.temp_max ?? null,
    tempMinC: today.temp_min ?? null,
    windKmh: obs.data?.wind?.speed_kilometre ?? null,
    windDirection: obs.data?.wind?.direction ?? null,
    rainChance,
    summary,
    iconDescriptor: today.icon_descriptor ?? null,
  };
}

export async function getBoortWeather(): Promise<WeatherData | null> {
  const cached = await db.weatherCache.findUnique({ where: { id: CACHE_ID } });
  const cacheAgeMs = cached ? Date.now() - cached.fetchedAt.getTime() : Infinity;

  if (cached && cacheAgeMs < FRESH_MS) {
    return { ...cached, stale: false, ageMinutes: Math.round(cacheAgeMs / 60000) };
  }

  try {
    const live = await fetchLiveWeather();
    await db.weatherCache.upsert({
      where: { id: CACHE_ID },
      create: { id: CACHE_ID, ...live, fetchedAt: new Date() },
      update: { ...live, fetchedAt: new Date() },
    });
    return { ...live, stale: false, ageMinutes: 0 };
  } catch (err) {
    console.error("BOM weather fetch failed, falling back to cache:", err);
    if (cached) {
      return { ...cached, stale: true, ageMinutes: Math.round(cacheAgeMs / 60000) };
    }
    return null;
  }
}

// Small set of representative icon shapes — BOM returns ~30 descriptors,
// this buckets them into what the Weather card actually renders.
export function iconBucket(descriptor: string | null): "sun" | "cloud" | "rain" | "storm" {
  if (!descriptor) return "cloud";
  if (/storm/.test(descriptor)) return "storm";
  if (/shower|rain/.test(descriptor)) return "rain";
  if (/sunny|clear/.test(descriptor)) return "sun";
  return "cloud";
}
