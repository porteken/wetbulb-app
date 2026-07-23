import { parseReferenceGraphDataResponse } from "@/lib/api/schemas";
import {
  DEFAULT_GRAPH_SEASON,
  DEFAULT_WETBULB_BASIS,
  type GraphSeason,
  normalizeGraphSeason,
  normalizeWetbulbBasis,
  type WetbulbBasis,
} from "@/lib/constants";
import { FetchError } from "@/lib/utils/errors";
import { validateLocationId, validateYear } from "@/lib/utils/validation";

import {
  apiRequest,
  buildQueryString,
  fetchApiJson,
  hasError,
  parseWithFetchError,
} from "./api-client";

import type { ReferenceGraphDataProperties } from "@/types/types";

export async function FetchReferenceGraphData(
  year: string,
  locationId: number,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
): Promise<ReferenceGraphDataProperties> {
  const resolvedSeason = normalizeGraphSeason(season);
  const resolvedBasis = normalizeWetbulbBasis(basis);

  if (!validateYear(year)) {
    throw new FetchError("Invalid year format. Must be a 4-digit year.");
  }

  if (!validateLocationId(locationId)) {
    throw new FetchError(`Invalid location ID: ${locationId}`);
  }

  const response = await apiRequest(async () => {
    const payload = await fetchApiJson(
      `/api/data/reference?${buildQueryString({
        basis: resolvedBasis,
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
