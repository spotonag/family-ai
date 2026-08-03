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
const TOMORROW_CACHE_ID = "boort_tomorrow";
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

// A future day only ever has a forecast, never a live observation — no
// current temp or wind reading exists for tomorrow yet.
export type ForecastDay = {
  tempMaxC: number | null;
  tempMinC: number | null;
  rainChance: number | null;
  summary: string;
  iconDescriptor: string | null;
};

function buildForecastDay(day: any, label: string): ForecastDay {
  const rainChance = day.rain?.chance ?? null;
  const summaryText = day.extended_text || day.short_text || "No summary available.";
  return {
    tempMaxC: day.temp_max ?? null,
    tempMinC: day.temp_min ?? null,
    rainChance,
    summary: `${label}: ${day.temp_max}°C, ${summaryText.toLowerCase().replace(/\.$/, "")}${
      rainChance !== null ? `, ${rainChance}% chance of rain` : ""
    }.`,
    iconDescriptor: day.icon_descriptor ?? null,
  };
}

async function fetchLiveWeather(): Promise<{
  today: Omit<WeatherData, "stale" | "ageMinutes">;
  tomorrow: ForecastDay | null;
}> {
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
  const todayForecast = buildForecastDay(today, "Today");
  const tomorrowDay = daily.data?.[1];

  return {
    today: {
      tempC,
      tempMaxC: todayForecast.tempMaxC,
      tempMinC: todayForecast.tempMinC,
      windKmh: obs.data?.wind?.speed_kilometre ?? null,
      windDirection: obs.data?.wind?.direction ?? null,
      rainChance: todayForecast.rainChance,
      summary: todayForecast.summary,
      iconDescriptor: todayForecast.iconDescriptor,
    },
    tomorrow: tomorrowDay ? buildForecastDay(tomorrowDay, "Tomorrow") : null,
  };
}

export async function getBoortWeather(): Promise<(WeatherData & { tomorrow: ForecastDay | null }) | null> {
  const cached = await db.weatherCache.findUnique({ where: { id: CACHE_ID } });
  const cacheAgeMs = cached ? Date.now() - cached.fetchedAt.getTime() : Infinity;

  if (cached && cacheAgeMs < FRESH_MS) {
    const tomorrowCached = await db.weatherCache.findUnique({ where: { id: TOMORROW_CACHE_ID } });
    return {
      ...cached,
      stale: false,
      ageMinutes: Math.round(cacheAgeMs / 60000),
      tomorrow: tomorrowCached
        ? {
            tempMaxC: tomorrowCached.tempMaxC,
            tempMinC: tomorrowCached.tempMinC,
            rainChance: tomorrowCached.rainChance,
            summary: tomorrowCached.summary,
            iconDescriptor: tomorrowCached.iconDescriptor,
          }
        : null,
    };
  }

  try {
    const live = await fetchLiveWeather();
    await db.weatherCache.upsert({
      where: { id: CACHE_ID },
      create: { id: CACHE_ID, ...live.today, fetchedAt: new Date() },
      update: { ...live.today, fetchedAt: new Date() },
    });
    if (live.tomorrow) {
      await db.weatherCache.upsert({
        where: { id: TOMORROW_CACHE_ID },
        create: { id: TOMORROW_CACHE_ID, tempC: 0, ...live.tomorrow, fetchedAt: new Date() },
        update: { ...live.tomorrow, fetchedAt: new Date() },
      });
    }
    return { ...live.today, stale: false, ageMinutes: 0, tomorrow: live.tomorrow };
  } catch (err) {
    console.error("BOM weather fetch failed, falling back to cache:", err);
    if (cached) {
      const tomorrowCached = await db.weatherCache.findUnique({ where: { id: TOMORROW_CACHE_ID } });
      return {
        ...cached,
        stale: true,
        ageMinutes: Math.round(cacheAgeMs / 60000),
        tomorrow: tomorrowCached
          ? {
              tempMaxC: tomorrowCached.tempMaxC,
              tempMinC: tomorrowCached.tempMinC,
              rainChance: tomorrowCached.rainChance,
              summary: tomorrowCached.summary,
              iconDescriptor: tomorrowCached.iconDescriptor,
            }
          : null,
      };
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
