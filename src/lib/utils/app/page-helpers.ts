import { FetchLocations } from "@/lib/api/fetch-server";
import {
  DATA_REGION_COOKIE_NAME,
  DEFAULT_FORECAST_ENABLED,
  DEFAULT_FORECAST_YEARS_AHEAD,
  DEFAULT_GRAPH_MEASURE,
  DEFAULT_GRAPH_SEASON,
  ERROR_MESSAGES,
  FORECAST_ENABLED_COOKIE_NAME,
  FORECAST_YEARS_AHEAD_COOKIE_NAME,
  GRAPH_MEASURE_COOKIE_NAME,
  GRAPH_SEASON_COOKIE_NAME,
  MAX_FORECAST_YEARS_AHEAD,
  MIN_FORECAST_YEARS_AHEAD,
  normalizeDataRegion,
  normalizeGraphSeason,
  type DataRegion,
} from "@/lib/constants";
import { getLatestCookieValue } from "@/lib/utils/server-cookies";
import { cookies } from "next/headers";

export const getGraphMeasureFromCookies = async (): Promise<string> => {
  const cookieStore = await cookies();
  const value = getLatestCookieValue(cookieStore, GRAPH_MEASURE_COOKIE_NAME);
  return value && value.length > 0 ? value : DEFAULT_GRAPH_MEASURE;
};

export const getGraphSeasonFromCookies = async () => {
  const cookieStore = await cookies();

  return normalizeGraphSeason(
    getLatestCookieValue(cookieStore, GRAPH_SEASON_COOKIE_NAME) ??
      DEFAULT_GRAPH_SEASON,
  );
};

export const getForecastPreferencesFromCookies = async (): Promise<{
  enabled: boolean;
  yearsAhead: number;
}> => {
  const cookieStore = await cookies();
  const forecastEnabledRaw = getLatestCookieValue(
    cookieStore,
    FORECAST_ENABLED_COOKIE_NAME,
  );
  const forecastYearsAheadRaw = getLatestCookieValue(
    cookieStore,
    FORECAST_YEARS_AHEAD_COOKIE_NAME,
  );

  const enabled =
    forecastEnabledRaw === undefined
      ? DEFAULT_FORECAST_ENABLED
      : forecastEnabledRaw === "true";

  const parsedYearsAhead = Number(forecastYearsAheadRaw);
  const yearsAhead =
    Number.isInteger(parsedYearsAhead) &&
    parsedYearsAhead >= MIN_FORECAST_YEARS_AHEAD &&
    parsedYearsAhead <= MAX_FORECAST_YEARS_AHEAD
      ? parsedYearsAhead
      : DEFAULT_FORECAST_YEARS_AHEAD;

  return {
    enabled,
    yearsAhead,
  };
};

export const getDataRegionFromCookies = async (): Promise<DataRegion> => {
  const cookieStore = await cookies();

  return normalizeDataRegion(
    getLatestCookieValue(cookieStore, DATA_REGION_COOKIE_NAME),
  );
};

export const getLocationData = async (region: DataRegion) => {
  const { LocationOptions, locations } = await FetchLocations(region);

  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error(ERROR_MESSAGES.NO_DATA);
  }

  return { LocationOptions, locations };
};
