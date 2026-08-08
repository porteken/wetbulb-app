import { RankingsMain } from "@/features/rankings";
import {
  FetchAvailableYearRange,
  FetchCityRankings,
  FetchLocations,
} from "@/lib/api/fetch-server";
import {
  DATA_REGION_COOKIE_NAME,
  DEFAULT_WETBULB_BASIS,
  GRAPH_CONFIG,
  normalizeDataRegion,
  normalizeGraphSeason,
  normalizeWetbulbBasis,
  RANKINGS_WETBULB_LEVEL_COOKIE_NAME,
  RANKINGS_SEASON_COOKIE_NAME,
  RANKINGS_STATE_COOKIE_NAME,
  RANKINGS_YEAR_COOKIE_NAME,
  WETBULB_BASIS_COOKIE_NAME,
} from "@/lib/constants";
import {
  getCurrentGraphSeason,
  isCurrentYearRankingAvailable,
} from "@/lib/utils/season-availability";
import { cookies } from "next/headers";

import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "City rankings by wet-bulb temperature values",
  title: "City Rankings - Wetbulb Index",
};
const yearMapping = (
  value: string | undefined,
  cookie_value: string | undefined,
) => {
  if (value) {
    return Number(value);
  } else if (cookie_value) {
    return Number(cookie_value);
  }
  return Math.min(
    Math.max(new Date().getUTCFullYear(), GRAPH_CONFIG.YEAR_RANGE.START),
    GRAPH_CONFIG.YEAR_RANGE.END,
  );
};

const resolveRankingsYear = (
  queryYear: string | undefined,
  cookieYear: string | undefined,
  earliestYear: number,
  season: ReturnType<typeof normalizeGraphSeason>,
) => {
  const requestedYear = Math.max(
    yearMapping(queryYear, cookieYear),
    earliestYear,
  );
  return requestedYear === GRAPH_CONFIG.YEAR_RANGE.END &&
    !isCurrentYearRankingAvailable(season)
    ? GRAPH_CONFIG.YEAR_RANGE.END - 1
    : requestedYear;
};

export default async function RankingsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ measure?: string; year?: string }>;
}>) {
  const parameters = await searchParams;
  const cookieStore = await cookies();

  const wetbulbLevelFromCookie = cookieStore.get(
    RANKINGS_WETBULB_LEVEL_COOKIE_NAME,
  )?.value;
  const seasonFromCookie = cookieStore.get(RANKINGS_SEASON_COOKIE_NAME)?.value;
  const stateFromCookie = cookieStore.get(RANKINGS_STATE_COOKIE_NAME)?.value;
  const yearFromCookie = cookieStore.get(RANKINGS_YEAR_COOKIE_NAME)?.value;
  const basisFromCookie = cookieStore.get(WETBULB_BASIS_COOKIE_NAME)?.value;
  const region = normalizeDataRegion(
    cookieStore.get(DATA_REGION_COOKIE_NAME)?.value,
  );

  const normalizedSeason = normalizeGraphSeason(seasonFromCookie);
  const initialSeason =
    seasonFromCookie === undefined || seasonFromCookie !== normalizedSeason
      ? getCurrentGraphSeason()
      : normalizedSeason;
  const shouldPersistInitialSeason =
    seasonFromCookie !== undefined && seasonFromCookie !== initialSeason;
  const availableYearRange = await FetchAvailableYearRange(region);
  const earliestYear = availableYearRange
    ? availableYearRange.start_year
    : GRAPH_CONFIG.YEAR_RANGE.START;
  const year = resolveRankingsYear(
    parameters.year,
    yearFromCookie,
    earliestYear,
    initialSeason,
  );
  const basis = normalizeWetbulbBasis(basisFromCookie ?? DEFAULT_WETBULB_BASIS);
  const [rankings, { LocationOptions }] = await Promise.all([
    FetchCityRankings(year, initialSeason, basis, region),
    FetchLocations(region),
  ]);

  return (
    <RankingsMain
      initialWetbulbLevel={wetbulbLevelFromCookie ?? ""}
      baselineYear={earliestYear}
      earliestYear={earliestYear}
      initialSeason={initialSeason}
      initialState={stateFromCookie ?? ""}
      initialYear={year}
      LocationOptions={LocationOptions}
      rankings={rankings}
      region={region}
      shouldPersistInitialSeason={shouldPersistInitialSeason}
    />
  );
}
