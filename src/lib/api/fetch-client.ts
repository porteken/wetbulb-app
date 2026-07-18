import {
  parseForecastDataResponse,
  parseTrendGraphDataResponse,
} from "@/lib/api/schemas";
import {
  DEFAULT_GRAPH_SEASON,
  DEFAULT_FORECAST_SCENARIO,
  DEFAULT_WETBULB_BASIS,
  type GraphSeason,
  type ForecastScenario,
  normalizeGraphSeason,
  normalizeWetbulbBasis,
  type WetbulbBasis,
} from "@/lib/constants";
import { FetchError } from "@/lib/utils/errors";
import {
  validateLocationId,
  validateTrendOption,
} from "@/lib/utils/validation";

import {
  apiRequest,
  buildQueryString,
  fetchApiJson,
  hasError,
  parseWithFetchError,
} from "./api-client";

import type { TrendGraphDataProperties } from "@/types/types";

interface ForecastDataFilters {
  basis?: WetbulbBasis;
  option?: string;
  season?: GraphSeason;
  scenario?: ForecastScenario;
}

export async function FetchForecastData(
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
    throw new FetchError(`Invalid location ID: ${locationId}`);
  }

  if (!validateTrendOption(option)) {
    throw new FetchError(`Invalid trend option: ${option}`);
  }

  if (!("window" in globalThis)) {
    throw new TypeError(
      "FetchForecastData can only be called in browser environment",
    );
  }

  const resolvedSeason = normalizeGraphSeason(season);
  const resolvedBasis = normalizeWetbulbBasis(basis);

  const response = await apiRequest(async () => {
    const payload = await fetchApiJson(
      `/api/data/forecast?${buildQueryString({
        basis: resolvedBasis,
        locationId,
        option,
        scenario,
        season: resolvedSeason,
        yearsAhead,
      })}`,
    );

    return parseWithFetchError("Forecast", parseForecastDataResponse, payload);
  });

  if (hasError(response)) {
    throw new FetchError(
      `Failed to fetch forecast data for location ${locationId}: ${response.error.message}`,
      {
        code: response.error.code,
        context: { locationId, statusCode: response.error.status },
      },
    );
  }

  return response.data;
}

export async function FetchTrendGraphData(
  option: string,
  locationId: number,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
): Promise<TrendGraphDataProperties> {
  const resolvedSeason = normalizeGraphSeason(season);
  const resolvedBasis = normalizeWetbulbBasis(basis);

  if (!validateTrendOption(option)) {
    throw new FetchError("Invalid trend option. Must be 'avg' or 'max'");
  }

  if (!validateLocationId(locationId)) {
    throw new FetchError(`Invalid location ID: ${locationId}`);
  }

  const response = await apiRequest(async () => {
    const payload = await fetchApiJson(
      `/api/data/trend?${buildQueryString({
        basis: resolvedBasis,
        locationId,
        option,
        season: resolvedSeason,
      })}`,
    );

    return parseWithFetchError(
      "Trend graph",
      parseTrendGraphDataResponse,
      payload,
    );
  });

  if (hasError(response)) {
    throw new FetchError(
      `Failed to fetch trend graph data for location ${locationId} (${option}): ${response.error.message}`,
      {
        code: response.error.code,
        context: { locationId, option, statusCode: response.error.status },
      },
    );
  }

  return response.data;
}

export { FetchReferenceGraphData } from "./reference-graph-data";
