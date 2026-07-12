import {
  formatSchemaValidationError,
  isSchemaValidationError,
  parseReferenceGraphDataResponse,
} from "@/lib/api/schemas";
import {
  DEFAULT_GRAPH_SEASON,
  type GraphSeason,
  normalizeGraphSeason,
} from "@/lib/constants";
import { FetchError } from "@/lib/utils/errors";
import { validateLocationId, validateYear } from "@/lib/utils/validation";

import { apiRequest, fetchApiJson, hasError } from "./api-client";

import type { ReferenceGraphDataProperties } from "@/types/types";

const buildQueryString = (params: Record<string, number | string>) =>
  new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();

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

export async function FetchReferenceGraphData(
  year: string,
  locationId: number,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
): Promise<ReferenceGraphDataProperties> {
  const resolvedSeason = normalizeGraphSeason(season);

  if (!validateYear(year)) {
    throw new FetchError("Invalid year format. Must be a 4-digit year.");
  }

  if (!validateLocationId(locationId)) {
    throw new FetchError(`Invalid location ID: ${locationId}`);
  }

  const response = await apiRequest(async () => {
    const payload = await fetchApiJson(
      `/api/data/reference?${buildQueryString({
        locationId,
        season: resolvedSeason,
        year,
      })}`,
    );

    return parseWithFetchError(
      "Reference graph",
      parseReferenceGraphDataResponse,
      payload,
    );
  });

  if (hasError(response)) {
    throw new FetchError(
      `Failed to fetch reference data for location ${locationId}, year ${year}: ${response.error.message}`,
      {
        code: response.error.code,
        context: { locationId, statusCode: response.error.status, year },
      },
    );
  }

  return response.data;
}
