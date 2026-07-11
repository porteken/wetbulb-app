import {
  formatSchemaValidationError,
  isSchemaValidationError,
  parseForecastDataResponse,
  parseTrendGraphDataResponse,
} from "@/lib/api/schemas";
import {
  DEFAULT_GRAPH_SEASON,
  type GraphSeason,
  normalizeGraphSeason,
} from "@/lib/constants";
import { FetchError } from "@/lib/utils/errors";
import {
  validateLocationId,
  validateTrendOption,
} from "@/lib/utils/validation";

import { apiRequest, fetchApiJson, hasError } from "./api-client";

import type { TrendGraphDataProperties } from "@/types/types";

const buildQueryString = (params: Record<string, number | string>) =>
  new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();

export async function FetchForecastData(
  locationId: number,
  yearsAhead: number,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
  option: string = "avg",
): Promise<
  | undefined
  | {
      forecastValues: number[];
      forecastYears: number[];
      lowerBound10: number[];
      upperBound90: number[];
    }
> {
  if (!validateLocationId(locationId)) {
    throw new FetchError(`Invalid location ID: ${locationId}`);
  }

  if (!validateTrendOption(option)) {
    throw new FetchError(`Invalid trend option: ${option}`);
  }

  if (globalThis.window === undefined) {
    throw new TypeError(
      "FetchForecastData can only be called in browser environment",
    );
  }

  const resolvedSeason = normalizeGraphSeason(season);

  const response = await apiRequest(async () => {
    const payload = await fetchApiJson(
      `/api/data/forecast?${buildQueryString({
        locationId,
        option,
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
): Promise<TrendGraphDataProperties> {
  const resolvedSeason = normalizeGraphSeason(season);

  if (!validateTrendOption(option)) {
    throw new FetchError("Invalid trend option. Must be 'avg' or 'max'");
  }

  if (!validateLocationId(locationId)) {
    throw new FetchError(`Invalid location ID: ${locationId}`);
  }

  const response = await apiRequest(async () => {
    const payload = await fetchApiJson(
      `/api/data/trend?${buildQueryString({
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

const parseWithFetchError = <T>(
  resource: string,
  parser: (payload: unknown) => T,
  payload: unknown,
): T => {
  try {
    return parser(payload);
  } catch (error) {
    if (isSchemaValidationError(error)) {
      throw new FetchError(formatSchemaValidationError(resource, error), error);
    }

    throw error;
  }
};
