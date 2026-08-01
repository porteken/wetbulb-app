"use server";

import {
  filterReferenceRowsBySeason,
  mapReferenceRowsToGraphData,
  mapTrendRowsToGraphData,
} from "@/lib/api/graph-data";
import {
  formatSchemaValidationError,
  isSchemaValidationError,
  parseForecastRows,
  parseHistoricalYearRows,
  parseLocationRows,
  parseRankingViewRows,
  parseReferenceGraphRows,
  parseTrendGraphRows,
} from "@/lib/api/schemas";
import {
  DEFAULT_DATA_REGION,
  DEFAULT_GRAPH_SEASON,
  DEFAULT_FORECAST_SCENARIO,
  DEFAULT_WETBULB_BASIS,
  GRAPH_CONFIG,
  type DataRegion,
  type GraphSeason,
  type ForecastScenario,
  normalizeDataRegion,
  normalizeGraphSeason,
  normalizeWetbulbBasis,
  type WetbulbBasis,
} from "@/lib/constants";
import {
  fetchCityRankingsRows,
  fetchForecastRows,
  fetchHistoricalYearRow,
  fetchLocationRows,
  fetchReferenceGraphRows,
  fetchTrendGraphRows,
} from "@/lib/db/queries";
import { DatabaseError } from "@/lib/utils/errors";
import { groupLocationsByState } from "@/lib/utils/location-options";
import {
  isCurrentYearRankingAvailable,
  isCurrentYearTrendAvailable,
} from "@/lib/utils/season-availability";
import {
  validateLocationId,
  validateTrendOption,
  validateYear,
} from "@/lib/utils/validation";
import { unstable_cache } from "next/cache";

import type {
  FetchLocationProperties,
  ReferenceGraphDataProperties,
  TrendGraphDataProperties,
} from "@/types/types";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const DATA_CACHE_REVALIDATE_SECONDS = 60 * 60;
const fetchReferenceGraphRowsCached = unstable_cache(
  fetchReferenceGraphRows,
  ["reference-data-rows"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: ["reference-data"],
  },
);

interface LocationQueryRow {
  city: unknown;
  id?: unknown;
  lat: unknown;
  lng: unknown;
  location_id?: unknown;
  state: unknown;
}

const parseWithDatabaseError = <T>(
  resource: string,
  parser: (payload: unknown) => T,
  payload: unknown,
): T => {
  try {
    return parser(payload);
  } catch (error) {
    if (isSchemaValidationError(error)) {
      throw new DatabaseError(
        formatSchemaValidationError(resource, error),
        error,
      );
    }

    throw error;
  }
};

async function fetchCityRankingsUncached(
  year: number,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
  region: DataRegion = DEFAULT_DATA_REGION,
): Promise<
  Array<{
    avg_wetbulb: number;
    changeFrom2000: number | undefined;
    city: string;
    FutureValueLower: number | undefined;
    FutureValueUpper: number | undefined;
    location_id: number;
    max_wetbulb: number | undefined;
    p5: number | undefined;
    p95: number | undefined;
    rank: number;
    state: string;
  }>
> {
  const resolvedSeason = normalizeGraphSeason(season);
  const resolvedBasis = normalizeWetbulbBasis(basis);
  const resolvedRegion = normalizeDataRegion(region);

  if (!year || Number.isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new DatabaseError(
      `Invalid year: ${year}. Must be between ${MIN_YEAR} and ${MAX_YEAR}.`,
    );
  }

  if (
    year === GRAPH_CONFIG.YEAR_RANGE.END &&
    !isCurrentYearRankingAvailable(resolvedSeason)
  ) {
    return [];
  }

  let rows;
  try {
    rows = await fetchCityRankingsRows(
      year,
      resolvedSeason,
      resolvedBasis,
      resolvedRegion,
    );
  } catch (error) {
    throw new DatabaseError(
      "Failed to fetch city rankings from database",
      error,
    );
  }

  const validatedRows = parseWithDatabaseError(
    "City rankings view",
    parseRankingViewRows,
    rows,
  );

  return validatedRows
    .toSorted((a, b) => b.avg_wetbulb - a.avg_wetbulb)
    .map((row, index) => ({
      avg_wetbulb: row.avg_wetbulb,
      changeFrom2000: row.change_from_2000 ?? undefined,
      city: row.city,
      FutureValueLower: row.future_lower ?? undefined,
      FutureValueUpper: row.future_upper ?? undefined,
      location_id: row.location_id,
      max_wetbulb: row.max_wetbulb ?? undefined,
      p5: row.p5 ?? undefined,
      p95: row.p95 ?? undefined,
      rank: index + 1,
      state: row.state,
    }));
}

async function fetchLocationsUncached(
  region: DataRegion = DEFAULT_DATA_REGION,
): Promise<FetchLocationProperties> {
  let locations;
  try {
    locations = await fetchLocationRows("id", normalizeDataRegion(region));
  } catch (error) {
    throw new DatabaseError(
      "Failed to fetch location data from database",
      error,
    );
  }

  const normalizedLocations = locations.map(normalizeLocationRow);
  const sanitizedLocations =
    filterRowsWithNonNegativeLocationId(normalizedLocations);
  const validatedLocations = parseWithDatabaseError(
    "Locations",
    parseLocationRows,
    sanitizedLocations,
  );

  return {
    LocationOptions: groupLocationsByState(validatedLocations),
    locations: validatedLocations,
  };
}

interface ForecastDataFilters {
  basis?: WetbulbBasis;
  option?: string;
  season?: GraphSeason;
  scenario?: ForecastScenario;
}

async function fetchForecastDataUncached(
  locationId: number,
  yearsAhead: number,
  filters: ForecastDataFilters = {},
): Promise<
  | undefined
  | {
      forecastValues: number[];
      forecastYears: number[];
      lowerBound10: number[];
      upperBound90: number[];
      scenario: ForecastScenario;
    }
> {
  const {
    basis = DEFAULT_WETBULB_BASIS,
    option = "avg",
    scenario = DEFAULT_FORECAST_SCENARIO,
    season = DEFAULT_GRAPH_SEASON,
  } = filters;

  if (!validateLocationId(locationId)) {
    throw new DatabaseError(`Invalid locationId: ${locationId}`);
  }

  if (!validateTrendOption(option)) {
    throw new DatabaseError(`Invalid trend option: ${option}`);
  }

  const resolvedSeason = normalizeGraphSeason(season);
  const resolvedBasis = normalizeWetbulbBasis(basis);

  let historicalData;
  try {
    historicalData = await fetchHistoricalYearRow(locationId, resolvedSeason);
  } catch (error) {
    throw new DatabaseError(
      "Failed to fetch forecast data from database",
      error,
    );
  }

  if (!historicalData) {
    return undefined;
  }

  const validatedHistoricalData = parseWithDatabaseError(
    "Historical year",
    parseHistoricalYearRows,
    [historicalData],
  );
  const firstHistorical = validatedHistoricalData[0];
  if (!firstHistorical) {
    return undefined;
  }

  const queryWindow = {
    lastHistoricalYear: firstHistorical.year,
    targetYear: firstHistorical.year + yearsAhead,
  };

  let forecastRows;
  try {
    forecastRows = await fetchForecastRows(locationId, queryWindow, {
      basis: resolvedBasis,
      option,
      scenario,
      season: resolvedSeason,
    });
  } catch (error) {
    throw new DatabaseError(
      "Failed to fetch forecast data from database",
      error,
    );
  }

  const validatedForecastRows = parseWithDatabaseError(
    "Forecast",
    parseForecastRows,
    forecastRows,
  );

  if (validatedForecastRows.length === 0) {
    return undefined;
  }

  return {
    forecastValues: validatedForecastRows.map(({ wetbulb }) => wetbulb),
    forecastYears: validatedForecastRows.map(({ year }) => year),
    lowerBound10: validatedForecastRows.map(({ lower }) => lower),
    scenario,
    upperBound90: validatedForecastRows.map(({ upper }) => upper),
  };
}

async function fetchReferenceGraphDataUncached(
  year: string,
  locationId: number,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
): Promise<ReferenceGraphDataProperties> {
  const resolvedSeason = normalizeGraphSeason(season);
  const resolvedBasis = normalizeWetbulbBasis(basis);

  if (!validateLocationId(locationId)) {
    throw new DatabaseError(`Invalid locationId: ${locationId}`);
  }

  if (!validateYear(year)) {
    throw new DatabaseError(
      `Invalid year format: ${year}. Must be a 4-digit year.`,
    );
  }

  let rows;
  try {
    rows = await fetchReferenceGraphRowsCached(locationId, year, resolvedBasis);
  } catch (error) {
    throw new DatabaseError(
      "Failed to fetch reference graph data from database",
      error,
    );
  }

  const validatedRows = parseWithDatabaseError(
    "Reference graph",
    parseReferenceGraphRows,
    rows,
  );

  return mapReferenceRowsToGraphData(
    filterReferenceRowsBySeason(validatedRows, resolvedSeason),
  );
}

async function fetchTrendGraphDataUncached(
  option: string,
  locationId: number,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
): Promise<TrendGraphDataProperties> {
  const resolvedSeason = normalizeGraphSeason(season);
  const resolvedBasis = normalizeWetbulbBasis(basis);

  if (!validateLocationId(locationId)) {
    throw new DatabaseError(`Invalid locationId: ${locationId}`);
  }

  if (!validateTrendOption(option)) {
    throw new DatabaseError(
      `Invalid option: ${option}. Must be 'avg' or 'max'`,
    );
  }

  let rows;
  try {
    rows = await fetchTrendGraphRows(
      locationId,
      option,
      resolvedSeason,
      resolvedBasis,
    );
  } catch (error) {
    throw new DatabaseError(
      "Failed to fetch trend graph data from database",
      error,
    );
  }

  const validatedRows = parseWithDatabaseError(
    "Trend graph",
    parseTrendGraphRows,
    rows,
  );
  const availableRows = isCurrentYearTrendAvailable(resolvedSeason)
    ? validatedRows
    : validatedRows.filter(({ year }) => year < GRAPH_CONFIG.YEAR_RANGE.END);

  return mapTrendRowsToGraphData(availableRows);
}

export const FetchCityRankings = unstable_cache(
  fetchCityRankingsUncached,
  ["city-rankings"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: ["rankings"],
  },
);

export const FetchLocations = unstable_cache(
  fetchLocationsUncached,
  ["locations"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: ["locations"],
  },
);

export const FetchForecastData = unstable_cache(
  fetchForecastDataUncached,
  ["forecast-data"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: ["forecast-data"],
  },
);

export const FetchReferenceGraphData = fetchReferenceGraphDataUncached;

export const FetchTrendGraphData = unstable_cache(
  fetchTrendGraphDataUncached,
  ["trend-data"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: ["trend-data"],
  },
);

function normalizeLocationRow({
  id,
  location_id,
  ...location
}: LocationQueryRow) {
  return {
    ...location,
    location_id: id ?? location_id,
  };
}

function filterRowsWithNonNegativeLocationId<
  T extends {
    location_id?: unknown;
  },
>(rows: T[]): T[] {
  return rows.filter((row) => {
    const locationId = Number(row.location_id);
    return Number.isInteger(locationId) && locationId >= 0;
  });
}
