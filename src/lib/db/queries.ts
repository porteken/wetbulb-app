import { shouldUseRuntimeDbMocks } from "@/config/environment";
import { sortBy } from "@/lib/sort-by";
import { classifyDbError } from "@/lib/utils/errors";
import { getRuntimeMockTableRows } from "@/testing/runtime-mocks";
import { sql } from "kysely";

import { getDb, withDbRetry } from "./kysely";

import type { NumericLike } from "./types";
import type { GraphSeason } from "@/lib/constants";

export type TrendMetricOption = "avg" | "max";
type LocationIdentifierColumn = "id" | "location_id";

export interface ForecastQueryWindow {
  lastHistoricalYear: number;
  targetYear: number;
}

interface TrendGraphRow {
  location_id: number;
  wetbulb: NumericLike;
  year: number;
}

const isMissingColumnError = (
  error: unknown,
  relationName: string,
  columnName: string,
) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  const message = "message" in error ? error.message : undefined;

  if (typeof message !== "string") {
    return false;
  }

  if (code === "PGRST204") {
    return (
      message.includes(`'${columnName}'`) &&
      message.includes(`'${relationName}'`)
    );
  }

  return (
    code === "42703" &&
    message.includes(columnName) &&
    (message.includes(relationName) ||
      message.includes(`${relationName}.${columnName}`) ||
      message.includes(`"${columnName}"`))
  );
};

const getTrendMetricColumn = (option: TrendMetricOption) =>
  option === "max" ? "max_wetbulb" : "avg_wetbulb";

const getRuntimeCityRankingsRows = (year: number, season?: GraphSeason) => {
  const rows = getRuntimeMockTableRows("wetbulb_city_rankings_view");

  return rows.filter(
    (row) =>
      row.year === year && (season === undefined || row.season === season),
  );
};

const getRuntimeLocationRows = (column: LocationIdentifierColumn) => {
  const rows = getRuntimeMockTableRows("locations");

  return rows.map((row) => ({
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    [column]: row[column],
    state: row.state,
  }));
};

const getRuntimeTrendRows = (
  locationId: number,
  option: TrendMetricOption,
  season?: GraphSeason,
) => {
  const rows = getRuntimeMockTableRows("wetbulb_year_stats");
  const metricColumn = getTrendMetricColumn(option);

  return sortBy(
    rows
      .filter(
        (row) =>
          row.location_id === locationId &&
          (season === undefined || row.season === season),
      )
      .map<TrendGraphRow>((row) => ({
        location_id: row.location_id,
        wetbulb: row[metricColumn],
        year: row.year,
      })),
    "year",
  );
};

const getRuntimeReferenceRows = (locationId: number, year: string) => {
  const start = `${year}-01-01`;
  const end = `${Number(year) + 1}-01-01`;
  const rows = getRuntimeMockTableRows("wetbulb");

  return sortBy(
    rows.filter(
      (row) =>
        row.location_id === locationId && row.date >= start && row.date < end,
    ),
    "date",
  );
};

const getRuntimeHistoricalYearRow = (
  locationId: number,
  season?: GraphSeason,
) => {
  const rows = getRuntimeMockTableRows("wetbulb_year_stats");
  const [row] = sortBy(
    rows.filter(
      (item) =>
        item.location_id === locationId &&
        (season === undefined || item.season === season),
    ),
    "year",
    false,
  );

  return row ? { year: row.year } : undefined;
};

const buildLocationRowsQuery = (selectedColumn: LocationIdentifierColumn) =>
  getDb()
    .selectFrom("locations")
    .select(
      selectedColumn === "id"
        ? ["city", "lat", "lng", "id", "state"]
        : ["city", "lat", "lng", "location_id", "state"],
    );

const getRuntimeForecastRows = (
  locationId: number,
  queryWindow: ForecastQueryWindow,
  season?: GraphSeason,
  option: TrendMetricOption = "avg",
) => {
  const table = option === "max" ? "wetbulb_forecast_max" : "wetbulb_forecast";
  const rows = getRuntimeMockTableRows(table);

  return sortBy(
    rows.filter(
      (row) =>
        row.location_id === locationId &&
        row.year > queryWindow.lastHistoricalYear &&
        row.year <= queryWindow.targetYear &&
        (season === undefined || row.season === season),
    ),
    "year",
  );
};

export async function fetchCityRankingsRows(
  year: number,
  season?: GraphSeason,
) {
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeCityRankingsRows(year, season);
  }

  const buildQuery = (selectedSeason?: GraphSeason) => {
    let query = getDb()
      .selectFrom("wetbulb_city_rankings_view")
      .select([
        "avg_wetbulb",
        "change_from_2000",
        "city",
        "future_lower",
        "future_upper",
        "location_id",
        "max_wetbulb",
        "p10",
        "p90",
        "state",
        "year",
      ])
      .where("year", "=", year);

    if (selectedSeason !== undefined) {
      query = query.where("season", "=", selectedSeason);
    }

    return query;
  };

  try {
    return await withDbRetry(() => buildQuery(season).execute());
  } catch (error) {
    if (
      season !== undefined &&
      isMissingColumnError(error, "wetbulb_city_rankings_view", "season")
    ) {
      return buildQuery().execute();
    }

    throw classifyDbError(error);
  }
}

export async function fetchLocationRows(column: LocationIdentifierColumn) {
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeLocationRows(column);
  }

  try {
    return await withDbRetry(() => buildLocationRowsQuery(column).execute());
  } catch (error) {
    if (column === "id" && isMissingColumnError(error, "locations", "id")) {
      return buildLocationRowsQuery("location_id").execute();
    }

    throw classifyDbError(error);
  }
}

export async function fetchTrendGraphRows(
  locationId: number,
  option: TrendMetricOption,
  season?: GraphSeason,
) {
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeTrendRows(locationId, option, season);
  }

  const metricColumn = getTrendMetricColumn(option);
  const buildQuery = (selectedSeason?: GraphSeason) => {
    let query = getDb()
      .selectFrom("wetbulb_year_stats")
      .select(({ ref }) => [
        "location_id",
        "year",
        ref(metricColumn).as("wetbulb"),
      ])
      .where("location_id", "=", locationId);

    if (selectedSeason !== undefined) {
      query = query.where("season", "=", selectedSeason);
    }

    return query.orderBy("year", "asc");
  };

  try {
    return await withDbRetry(() => buildQuery(season).execute());
  } catch (error) {
    if (
      season !== undefined &&
      isMissingColumnError(error, "wetbulb_year_stats", "season")
    ) {
      return buildQuery().execute();
    }

    throw classifyDbError(error);
  }
}

export async function fetchReferenceGraphRows(
  locationId: number,
  year: string,
) {
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeReferenceRows(locationId, year);
  }

  return await withDbRetry(() =>
    getDb()
      .selectFrom("wetbulb")
      .select(({ ref }) => [
        sql<string>`cast(${ref("date")} as text)`.as("date"),
        "location_id",
        "wetbulb",
      ])
      .where("location_id", "=", locationId)
      .where("date", ">=", `${year}-01-01`)
      .where("date", "<", `${Number(year) + 1}-01-01`)
      .orderBy("date", "asc")
      .execute(),
  );
}

export async function fetchHistoricalYearRow(
  locationId: number,
  season?: GraphSeason,
) {
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeHistoricalYearRow(locationId, season);
  }

  const buildQuery = (selectedSeason?: GraphSeason) => {
    let query = getDb()
      .selectFrom("wetbulb_year_stats")
      .select("year")
      .where("location_id", "=", locationId);

    if (selectedSeason !== undefined) {
      query = query.where("season", "=", selectedSeason);
    }

    return query.orderBy("year", "desc").limit(1);
  };

  try {
    return await withDbRetry(() => buildQuery(season).executeTakeFirst());
  } catch (error) {
    if (
      season !== undefined &&
      isMissingColumnError(error, "wetbulb_year_stats", "season")
    ) {
      return buildQuery().executeTakeFirst();
    }

    throw classifyDbError(error);
  }
}

export async function fetchForecastRows(
  locationId: number,
  queryWindow: ForecastQueryWindow,
  season?: GraphSeason,
  option: TrendMetricOption = "avg",
) {
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeForecastRows(locationId, queryWindow, season, option);
  }

  const table = option === "max" ? "wetbulb_forecast_max" : "wetbulb_forecast";

  const buildQuery = (selectedSeason?: GraphSeason) => {
    let query = getDb()
      .selectFrom(table)
      .select(["year", "wetbulb", "lower", "upper"])
      .where("location_id", "=", locationId)
      .where("year", ">", queryWindow.lastHistoricalYear)
      .where("year", "<=", queryWindow.targetYear);

    if (selectedSeason !== undefined) {
      query = query.where("season", "=", selectedSeason);
    }

    return query.orderBy("year", "asc");
  };

  try {
    return await withDbRetry(() => buildQuery(season).execute());
  } catch (error) {
    if (season !== undefined && isMissingColumnError(error, table, "season")) {
      return buildQuery().execute();
    }

    throw classifyDbError(error);
  }
}
