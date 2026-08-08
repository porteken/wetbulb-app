import { shouldUseRuntimeDbMocks } from "@/config/environment";
import {
  DEFAULT_DATA_REGION,
  DEFAULT_FORECAST_SCENARIO,
  DEFAULT_WETBULB_BASIS,
  EU_LOCATION_ID_MIN,
  regionForLocationId,
} from "@/lib/constants";
import { sortBy } from "@/lib/sort-by";
import { classifyDbError } from "@/lib/utils/errors";
import { getRuntimeMockTableRows } from "@/testing/runtime-mocks";
import { sql } from "kysely";

import { getDb, withDbRetry } from "./kysely";

import type { AvailableYearRangeRow, NumericLike } from "./types";
import type {
  DataRegion,
  ForecastScenario,
  GraphSeason,
  WetbulbBasis,
} from "@/lib/constants";

export type TrendMetricOption = "avg" | "max";
type LocationIdentifierColumn = "id" | "location_id";
const NA_CITY_RANKINGS_VIEW = "wetbulb_city_rankings_view" as const;
const EU_CITY_RANKINGS_VIEW = "wetbulb_eu_city_rankings_view" as const;
type CityRankingsView =
  | typeof EU_CITY_RANKINGS_VIEW
  | typeof NA_CITY_RANKINGS_VIEW;

const getCityRankingsView = (region: DataRegion): CityRankingsView =>
  region === "eu" ? EU_CITY_RANKINGS_VIEW : NA_CITY_RANKINGS_VIEW;

const excludesEuLocations = (view: CityRankingsView) =>
  view === NA_CITY_RANKINGS_VIEW;

export interface ForecastQueryWindow {
  lastHistoricalYear: number;
  targetYear: number;
}

export interface ForecastRowsFilters {
  basis?: WetbulbBasis;
  option?: TrendMetricOption;
  season?: GraphSeason;
  scenario?: ForecastScenario;
}

interface TrendGraphRow {
  location_id: number;
  wetbulb: NumericLike;
  year: number;
}

export interface AvailableYearRange {
  endYear: number;
  startYear: number;
}

interface RankingsQueryOptions {
  baselineYear?: number;
  region?: DataRegion;
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

const getTrendMetricColumn = (
  option: TrendMetricOption,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
) => {
  if (basis === "avg") {
    return option === "max" ? "max_wetbulb_avg" : "avg_wetbulb_avg";
  }

  return option === "max" ? "max_wetbulb" : "avg_wetbulb";
};

const getRuntimeCityRankingsRows = (
  year: number,
  season?: GraphSeason,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
  region: DataRegion = DEFAULT_DATA_REGION,
) => {
  const rows = getRuntimeMockTableRows("wetbulb_city_rankings_view");

  return rows
    .filter(
      (row) =>
        row.year === year &&
        regionForLocationId(row.location_id) === region &&
        (season === undefined || row.season === season),
    )
    .map((row) => {
      if (basis === "avg") {
        Object.assign(row, {
          avg_wetbulb: row.avg_wetbulb_avg,
          change_from_baseline: row.change_from_baseline_avg,
          future_lower: row.future_lower_avg,
          future_upper: row.future_upper_avg,
          max_wetbulb: row.max_wetbulb_avg,
          p5: row.p5_avg,
          p95: row.p95_avg,
        });
      }

      return row;
    });
};

const getRuntimeLocationRows = (
  column: LocationIdentifierColumn,
  region: DataRegion = DEFAULT_DATA_REGION,
) => {
  const rows = getRuntimeMockTableRows("locations");

  return rows
    .filter((row) => regionForLocationId(row[column]) === region)
    .map((row) => ({
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
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
) => {
  const rows = getRuntimeMockTableRows("wetbulb_year_stats");
  const metricColumn = getTrendMetricColumn(option, basis);

  return sortBy(
    rows
      .filter(
        (row) =>
          row.location_id === locationId &&
          (season === undefined || row.season === season),
      )
      .map<TrendGraphRow>((row) => ({
        location_id: row.location_id,
        wetbulb: Number(row[metricColumn]),
        year: row.year,
      })),
    "year",
  );
};

const getRuntimeReferenceRows = (
  locationId: number,
  year: string,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
) => {
  const start = `${year}-01-01`;
  const end = `${Number(year) + 1}-01-01`;
  const rows = getRuntimeMockTableRows("wetbulb");

  const filtered = rows.filter(
    (row) =>
      row.location_id === locationId && row.date >= start && row.date < end,
  );

  const mapped =
    basis === "avg"
      ? filtered.map((row) => ({
          date: row.date,
          location_id: row.location_id,
          wetbulb: row.wetbulb_avg,
          wetbulb_avg: row.wetbulb_avg,
          year: row.year,
        }))
      : filtered;

  return sortBy(mapped, "date");
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

const buildLocationRowsQuery = (
  selectedColumn: LocationIdentifierColumn,
  region: DataRegion,
) => {
  const query = getDb()
    .selectFrom("locations")
    .select(
      selectedColumn === "id"
        ? ["city", "lat", "lng", "id", "state"]
        : ["city", "lat", "lng", "location_id", "state"],
    );

  return region === "eu"
    ? query.where(selectedColumn, ">=", EU_LOCATION_ID_MIN)
    : query.where(selectedColumn, "<", EU_LOCATION_ID_MIN);
};

const getRuntimeForecastRows = (
  locationId: number,
  queryWindow: ForecastQueryWindow,
  filters: ForecastRowsFilters = {},
) => {
  const { basis = DEFAULT_WETBULB_BASIS, option = "avg", season } = filters;
  const table = option === "max" ? "wetbulb_forecast_max" : "wetbulb_forecast";
  const rows = getRuntimeMockTableRows(table);

  return sortBy(
    rows
      .filter(
        (row) =>
          row.location_id === locationId &&
          row.year > queryWindow.lastHistoricalYear &&
          row.year <= queryWindow.targetYear &&
          (season === undefined || row.season === season),
      )
      .map((row) => {
        if (basis === "avg") {
          Object.assign(row, {
            lower: row.lower_avg,
            upper: row.upper_avg,
            wetbulb: row.wetbulb_avg,
          });
        }

        return row;
      }),
    "year",
  );
};

const buildMaxBasisRankingsQuery = (
  view: CityRankingsView,
  year: number,
  selectedSeason?: GraphSeason,
) => {
  let query = getDb()
    .selectFrom(view)
    .select([
      "avg_wetbulb",
      "city",
      "future_lower",
      "future_upper",
      "location_id",
      "max_wetbulb",
      "p5",
      "p95",
      "state",
      "year",
    ])
    .where("year", "=", year);

  if (excludesEuLocations(view)) {
    query = query.where("location_id", "<", EU_LOCATION_ID_MIN);
  }

  if (selectedSeason !== undefined) {
    query = query.where("season", "=", selectedSeason);
  }

  return query;
};

interface LegacyRankingsColumns {
  bounds?: boolean;
  mixed?: boolean;
}

const buildAvgBasisRankingsQuery = (
  view: CityRankingsView,
  year: number,
  selectedSeason?: GraphSeason,
  legacy: LegacyRankingsColumns = {},
) => {
  const { bounds: useLegacyBounds = false, mixed: useLegacyMixed = false } =
    legacy;
  let query = getDb()
    .selectFrom(view)
    .select(
      useLegacyMixed
        ? [
            "avg_wetbulb_avg as avg_wetbulb",
            "city",
            "future_lower",
            "future_upper",
            "location_id",
            "max_wetbulb",
            "state",
            "year",
          ]
        : [
            "avg_wetbulb_avg as avg_wetbulb",
            "city",
            "future_lower_avg as future_lower",
            "future_upper_avg as future_upper",
            "location_id",
            "max_wetbulb_avg as max_wetbulb",
            "state",
            "year",
          ],
    )
    .select(
      useLegacyBounds ? ["p5", "p95"] : ["p5_avg as p5", "p95_avg as p95"],
    )
    .where("year", "=", year);

  if (excludesEuLocations(view)) {
    query = query.where("location_id", "<", EU_LOCATION_ID_MIN);
  }

  if (selectedSeason !== undefined) {
    query = query.where("season", "=", selectedSeason);
  }

  return query;
};

const isMissingRankingsBoundsColumnError = (
  error: unknown,
  view: CityRankingsView,
) =>
  isMissingColumnError(error, view, "p5_avg") ||
  isMissingColumnError(error, view, "p95_avg");

const isMissingAvgBasisRankingsColumnError = (
  error: unknown,
  view: CityRankingsView,
) =>
  isMissingColumnError(error, view, "max_wetbulb_avg") ||
  isMissingColumnError(error, view, "future_lower_avg") ||
  isMissingColumnError(error, view, "future_upper_avg");

const isMissingRankingsSeasonColumnError = (
  error: unknown,
  view: CityRankingsView,
  season: GraphSeason | undefined,
) => season !== undefined && isMissingColumnError(error, view, "season");

async function fetchCityRankingsMaxBasisRows(
  view: CityRankingsView,
  year: number,
  season?: GraphSeason,
) {
  try {
    return await withDbRetry(() =>
      buildMaxBasisRankingsQuery(view, year, season).execute(),
    );
  } catch (error) {
    if (isMissingRankingsSeasonColumnError(error, view, season)) {
      return buildMaxBasisRankingsQuery(view, year).execute();
    }

    throw classifyDbError(error);
  }
}

function fetchCityRankingsAvgBasisLegacyRows(
  view: CityRankingsView,
  year: number,
  season: GraphSeason | undefined,
  legacyError: unknown,
) {
  if (isMissingRankingsSeasonColumnError(legacyError, view, season)) {
    return buildAvgBasisRankingsQuery(view, year, undefined, {
      mixed: true,
    }).execute();
  }

  if (isMissingRankingsBoundsColumnError(legacyError, view)) {
    return buildAvgBasisRankingsQuery(view, year, season, {
      bounds: true,
      mixed: true,
    }).execute();
  }

  throw classifyDbError(legacyError);
}

async function fetchCityRankingsAvgBasisRows(
  view: CityRankingsView,
  year: number,
  season?: GraphSeason,
) {
  try {
    return await withDbRetry(() =>
      buildAvgBasisRankingsQuery(view, year, season).execute(),
    );
  } catch (error) {
    if (isMissingRankingsSeasonColumnError(error, view, season)) {
      return buildAvgBasisRankingsQuery(view, year).execute();
    }

    if (isMissingAvgBasisRankingsColumnError(error, view)) {
      try {
        return await withDbRetry(() =>
          buildAvgBasisRankingsQuery(view, year, season, {
            mixed: true,
          }).execute(),
        );
      } catch (legacyError) {
        return fetchCityRankingsAvgBasisLegacyRows(
          view,
          year,
          season,
          legacyError,
        );
      }
    }

    if (isMissingRankingsBoundsColumnError(error, view)) {
      return buildAvgBasisRankingsQuery(view, year, season, {
        bounds: true,
      }).execute();
    }

    throw classifyDbError(error);
  }
}

export async function fetchCityRankingsRows(
  year: number,
  season?: GraphSeason,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
  regionOrOptions: DataRegion | RankingsQueryOptions = DEFAULT_DATA_REGION,
) {
  const { baselineYear, region } =
    typeof regionOrOptions === "string"
      ? { baselineYear: undefined, region: regionOrOptions }
      : {
          baselineYear: regionOrOptions.baselineYear,
          region: regionOrOptions.region ?? DEFAULT_DATA_REGION,
        };
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeCityRankingsRows(year, season, basis, region);
  }

  const view = getCityRankingsView(region);
  const rows = await (basis === "max"
    ? fetchCityRankingsMaxBasisRows(view, year, season)
    : fetchCityRankingsAvgBasisRows(view, year, season));
  if (baselineYear === undefined) {
    return rows.map((row) =>
      Object.assign(row, { change_from_baseline: null }),
    );
  }

  const baselineRows = await fetchBaselineRows(
    baselineYear,
    season,
    basis,
    region,
  );
  const baselineByLocation = new Map(
    baselineRows.map((row) => [row.location_id, Number(row.wetbulb)]),
  );

  return rows.map((row) => {
    const baseline = baselineByLocation.get(row.location_id);
    return Object.assign(row, {
      change_from_baseline:
        baseline === undefined ? null : Number(row.avg_wetbulb) - baseline,
    });
  });
}

export async function fetchAvailableYearRange(
  region: DataRegion = DEFAULT_DATA_REGION,
  locationId?: number,
): Promise<AvailableYearRange | undefined> {
  if (shouldUseRuntimeDbMocks()) {
    const years = getRuntimeMockTableRows("wetbulb_year_stats")
      .filter(
        (row) =>
          (locationId === undefined || row.location_id === locationId) &&
          regionForLocationId(row.location_id) === region,
      )
      .map((row) => row.year);
    if (years.length === 0) {
      return undefined;
    }
    return { endYear: Math.max(...years), startYear: Math.min(...years) };
  }

  let query = getDb()
    .selectFrom("wetbulb_year_stats")
    .select((eb) => [
      eb.fn.min("year").as("start_year"),
      eb.fn.max("year").as("end_year"),
    ]);
  query =
    region === "eu"
      ? query.where("location_id", ">=", EU_LOCATION_ID_MIN)
      : query.where("location_id", "<", EU_LOCATION_ID_MIN);
  if (locationId !== undefined) {
    query = query.where("location_id", "=", locationId);
  }

  const row = (await withDbRetry(() => query.executeTakeFirst())) as
    | AvailableYearRangeRow
    | undefined;
  if (row?.start_year === null || row?.end_year === null || !row) {
    return undefined;
  }
  return {
    endYear: Number(row.end_year),
    startYear: Number(row.start_year),
  };
}

async function fetchBaselineRows(
  year: number,
  season: GraphSeason | undefined,
  basis: WetbulbBasis,
  region: DataRegion,
) {
  if (shouldUseRuntimeDbMocks()) {
    const metric = basis === "avg" ? "avg_wetbulb_avg" : "avg_wetbulb";
    return getRuntimeMockTableRows("wetbulb_year_stats")
      .filter(
        (row) =>
          row.year === year &&
          regionForLocationId(row.location_id) === region &&
          (season === undefined || row.season === season),
      )
      .map((row) => ({ location_id: row.location_id, wetbulb: row[metric] }));
  }

  const metric = basis === "avg" ? "avg_wetbulb_avg" : "avg_wetbulb";
  const buildQuery = (selectedSeason?: GraphSeason) => {
    let query = getDb()
      .selectFrom("wetbulb_year_stats")
      .select((eb) => ["location_id", eb.ref(metric).as("wetbulb")])
      .where("year", "=", year);
    query =
      region === "eu"
        ? query.where("location_id", ">=", EU_LOCATION_ID_MIN)
        : query.where("location_id", "<", EU_LOCATION_ID_MIN);
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
      isMissingColumnError(error, "wetbulb_year_stats", "season")
    ) {
      return buildQuery().execute();
    }
    throw classifyDbError(error);
  }
}

export async function fetchLocationRows(
  column: LocationIdentifierColumn,
  region: DataRegion = DEFAULT_DATA_REGION,
) {
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeLocationRows(column, region);
  }

  try {
    return await withDbRetry(() =>
      buildLocationRowsQuery(column, region).execute(),
    );
  } catch (error) {
    if (column === "id" && isMissingColumnError(error, "locations", "id")) {
      return buildLocationRowsQuery("location_id", region).execute();
    }

    throw classifyDbError(error);
  }
}

export async function fetchTrendGraphRows(
  locationId: number,
  option: TrendMetricOption,
  season?: GraphSeason,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
) {
  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeTrendRows(locationId, option, season, basis);
  }

  const metricColumn = getTrendMetricColumn(option, basis);
  const buildQuery = (selectedSeason?: GraphSeason) => {
    let query = getDb()
      .selectFrom("wetbulb_year_stats")
      .select((eb) => [
        "location_id",
        "year",
        eb.ref(metricColumn).as("wetbulb"),
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

export function fetchReferenceGraphRows(
  locationId: number,
  year: string,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
) {
  if (shouldUseRuntimeDbMocks()) {
    return Promise.resolve(getRuntimeReferenceRows(locationId, year, basis));
  }

  const buildQuery = (useAvgColumn: boolean) => {
    let query = getDb()
      .selectFrom("wetbulb")
      .select((eb) => [
        sql<string>`cast(${eb.ref("date")} as text)`.as("date"),
        "location_id",
        useAvgColumn
          ? eb.ref("wetbulb_avg").as("wetbulb")
          : eb.ref("wetbulb").as("wetbulb"),
      ])
      .where("location_id", "=", locationId)
      .where("date", ">=", `${year}-01-01`)
      .where("date", "<", `${Number(year) + 1}-01-01`);

    if (useAvgColumn) {
      query = query.where("wetbulb_avg", "is not", null);
    }

    return query.orderBy("date", "asc");
  };

  const runQuery = async (useAvgColumn: boolean) => {
    try {
      return await withDbRetry(() => buildQuery(useAvgColumn).execute());
    } catch (error) {
      if (
        useAvgColumn &&
        isMissingColumnError(error, "wetbulb", "wetbulb_avg")
      ) {
        return runQuery(false);
      }

      throw classifyDbError(error);
    }
  };

  return runQuery(basis === "avg");
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

export function fetchForecastRows(
  locationId: number,
  queryWindow: ForecastQueryWindow,
  filters: ForecastRowsFilters = {},
) {
  const {
    basis = DEFAULT_WETBULB_BASIS,
    option = "avg",
    scenario,
    season,
  } = filters;

  if (shouldUseRuntimeDbMocks()) {
    return getRuntimeForecastRows(locationId, queryWindow, {
      basis,
      option,
      scenario,
      season,
    });
  }

  const isMax = option === "max";
  const usesScenarioView =
    scenario !== undefined && scenario !== DEFAULT_FORECAST_SCENARIO;
  let table:
    | "wetbulb_forecast"
    | "wetbulb_forecast_max"
    | "wetbulb_forecast_max_scenarios"
    | "wetbulb_forecast_scenarios";
  if (usesScenarioView) {
    table = isMax
      ? "wetbulb_forecast_max_scenarios"
      : "wetbulb_forecast_scenarios";
  } else {
    table = isMax ? "wetbulb_forecast_max" : "wetbulb_forecast";
  }

  const buildQuery = (
    selectedSeason?: GraphSeason,
    useAvgColumns = basis === "avg",
  ) => {
    let query = getDb()
      .selectFrom(table)
      .select(
        useAvgColumns
          ? [
              "year",
              "wetbulb_avg as wetbulb",
              "lower_avg as lower",
              "upper_avg as upper",
            ]
          : ["year", "wetbulb", "lower", "upper"],
      )
      .where("location_id", "=", locationId)
      .where("year", ">", queryWindow.lastHistoricalYear)
      .where("year", "<=", queryWindow.targetYear);

    if (useAvgColumns) {
      query = query.where("wetbulb_avg", "is not", null);
    }

    if (selectedSeason !== undefined) {
      query = query.where("season", "=", selectedSeason);
    }

    if (usesScenarioView) {
      query = query.where("scenario", "=", scenario);
    }

    return query.orderBy("year", "asc");
  };

  const isMissingAvgColumnError = (error: unknown) =>
    isMissingColumnError(error, table, "wetbulb_avg") ||
    isMissingColumnError(error, table, "lower_avg") ||
    isMissingColumnError(error, table, "upper_avg");

  type ForecastRow = Awaited<
    ReturnType<ReturnType<typeof buildQuery>["execute"]>
  >;

  const runQuery = async (
    selectedSeason: GraphSeason | undefined,
    useAvgColumns: boolean,
  ): Promise<ForecastRow> => {
    try {
      return await withDbRetry(() =>
        buildQuery(selectedSeason, useAvgColumns).execute(),
      );
    } catch (error) {
      if (
        selectedSeason !== undefined &&
        isMissingColumnError(error, table, "season")
      ) {
        return runQuery(undefined, useAvgColumns);
      }

      if (useAvgColumns && isMissingAvgColumnError(error)) {
        return runQuery(selectedSeason, false);
      }

      throw classifyDbError(error);
    }
  };

  return runQuery(season, basis === "avg");
}
