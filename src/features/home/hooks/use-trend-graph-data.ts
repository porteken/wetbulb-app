import { queryKeys } from "@/lib/api/query-client";
import {
  DEFAULT_GRAPH_SEASON,
  DEFAULT_WETBULB_BASIS,
  type GraphSeason,
  type WetbulbBasis,
} from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";

import type { TrendGraphDataProperties } from "@/types/types";

const STALE_TIME_MS = 1000 * 60 * 5;

interface UseTrendGraphDataOptions {
  basis?: WetbulbBasis;
  enabled?: boolean;
  initialData?: TrendGraphDataProperties;
  locationId: number | undefined;
  option: string;
  season?: GraphSeason;
}

export const useTrendGraphData = ({
  basis = DEFAULT_WETBULB_BASIS,
  enabled = true,
  initialData,
  locationId,
  option,
  season = DEFAULT_GRAPH_SEASON,
}: UseTrendGraphDataOptions) => {
  const resolvedLocationId = locationId ?? 0;

  return useQuery({
    enabled: locationId !== undefined && enabled,
    initialData,
    queryFn: async () => {
      const { FetchTrendGraphData } = await import("@/lib/api/fetch-client");
      return FetchTrendGraphData(option, resolvedLocationId, season, basis);
    },
    queryKey: queryKeys.trendGraph(resolvedLocationId, option, season, basis),
    staleTime: STALE_TIME_MS,
  });
};
