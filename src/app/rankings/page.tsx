import { RankingsMain } from "@/features/rankings";
import { FetchCityRankings, FetchLocations } from "@/lib/api/fetch-server";
import {
  GRAPH_CONFIG,
  normalizeGraphSeason,
  RANKINGS_WETBULB_LEVEL_COOKIE_NAME,
  RANKINGS_SEASON_COOKIE_NAME,
  RANKINGS_STATE_COOKIE_NAME,
  RANKINGS_YEAR_COOKIE_NAME,
} from "@/lib/constants";
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
  return GRAPH_CONFIG.YEAR_RANGE.END;
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

  const initialSeason = normalizeGraphSeason(seasonFromCookie);
  const shouldPersistInitialSeason =
    seasonFromCookie !== undefined && seasonFromCookie !== initialSeason;
  const year = yearMapping(parameters.year, yearFromCookie);
  const [rankings, { LocationOptions }] = await Promise.all([
    FetchCityRankings(year, initialSeason),
    FetchLocations(),
  ]);

  return (
    <RankingsMain
      initialWetbulbLevel={wetbulbLevelFromCookie ?? ""}
      initialSeason={initialSeason}
      initialState={stateFromCookie ?? ""}
      initialYear={year}
      LocationOptions={LocationOptions}
      rankings={rankings}
      shouldPersistInitialSeason={shouldPersistInitialSeason}
    />
  );
}
