"use server";

import {
  FORECAST_ENABLED_COOKIE_NAME,
  FORECAST_YEARS_AHEAD_COOKIE_NAME,
  GRAPH_CONFIG,
  GRAPH_MEASURE_COOKIE_NAME,
  GRAPH_SEASON_COOKIE_NAME,
  MAX_FORECAST_YEARS_AHEAD,
  MIN_FORECAST_YEARS_AHEAD,
  normalizeGraphSeason,
  PREFERENCE_COOKIE_MAX_AGE_MS,
  type GraphSeason,
  RANKINGS_WETBULB_LEVEL_COOKIE_NAME,
  RANKINGS_SEASON_COOKIE_NAME,
  RANKINGS_STATE_COOKIE_NAME,
  RANKINGS_YEAR_COOKIE_NAME,
} from "@/lib/constants";
import { isSecureCookieEnvironment } from "@/lib/utils/server-cookies";
import { WETBULB_INDEX_LEGEND_ITEMS } from "@/lib/utils/wetbulb-index";
import { validateTrendOption } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const PREFERENCE_COOKIE_OPTIONS = {
  expires: new Date(Date.now() + PREFERENCE_COOKIE_MAX_AGE_MS),
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: isSecureCookieEnvironment(),
} as const;

const RANKINGS_COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: isSecureCookieEnvironment(),
} as const;

const RANKINGS_STATE_PATTERN = /^[A-Za-z .]{0,30}$/u;
const VALID_WETBULB_LEVELS = new Set(
  WETBULB_INDEX_LEGEND_ITEMS.map((item) => item.level as string),
);

const isValidRankingsYear = (year: number) =>
  Number.isInteger(year) &&
  year >= GRAPH_CONFIG.YEAR_RANGE.START &&
  year <= GRAPH_CONFIG.YEAR_RANGE.END;

export async function setForecastPreferences(
  forecastEnabled: boolean,
  forecastYearsAhead: number,
) {
  if (
    typeof forecastEnabled !== "boolean" ||
    !Number.isInteger(forecastYearsAhead) ||
    forecastYearsAhead < MIN_FORECAST_YEARS_AHEAD ||
    forecastYearsAhead > MAX_FORECAST_YEARS_AHEAD
  ) {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(
    FORECAST_ENABLED_COOKIE_NAME,
    String(forecastEnabled),
    PREFERENCE_COOKIE_OPTIONS,
  );

  cookieStore.set(
    FORECAST_YEARS_AHEAD_COOKIE_NAME,
    String(forecastYearsAhead),
    PREFERENCE_COOKIE_OPTIONS,
  );
}

export async function setGraphMeasure(measure: string) {
  if (!validateTrendOption(measure)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    GRAPH_MEASURE_COOKIE_NAME,
    measure,
    PREFERENCE_COOKIE_OPTIONS,
  );
}

export async function setGraphSeason(season: string) {
  if (normalizeGraphSeason(season) !== season) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(GRAPH_SEASON_COOKIE_NAME, season, PREFERENCE_COOKIE_OPTIONS);
}

export const setRankingsWetbulbLevel = async (wetbulbLevel: string) => {
  if (wetbulbLevel !== "" && !VALID_WETBULB_LEVELS.has(wetbulbLevel)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    RANKINGS_WETBULB_LEVEL_COOKIE_NAME,
    wetbulbLevel,
    RANKINGS_COOKIE_OPTIONS,
  );
  revalidatePath("/rankings");
};

export const setRankingsSeason = async (season: GraphSeason) => {
  if (normalizeGraphSeason(season) !== season) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(RANKINGS_SEASON_COOKIE_NAME, season, RANKINGS_COOKIE_OPTIONS);
  revalidatePath("/rankings");
};

export const setRankingsState = async (state: string) => {
  if (!RANKINGS_STATE_PATTERN.test(state)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(RANKINGS_STATE_COOKIE_NAME, state, RANKINGS_COOKIE_OPTIONS);
  revalidatePath("/rankings");
};

export const setRankingsYear = async (year: number) => {
  if (!isValidRankingsYear(year)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    RANKINGS_YEAR_COOKIE_NAME,
    String(year),
    RANKINGS_COOKIE_OPTIONS,
  );
  revalidatePath("/rankings");
};
