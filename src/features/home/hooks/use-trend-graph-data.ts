import { queryKeys } from "@/lib/api/query-client";
import { DEFAULT_GRAPH_SEASON, type GraphSeason } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";

import type { TrendGraphDataProperties } from "@/types/types";

const STALE_TIME_MS = 1000 * 60 * 5;

interface UseTrendGraphDataOptions {
  enabled?: boolean;
  initialData?: TrendGraphDataProperties;
  locationId: number | undefined;
  option: string;
  season?: GraphSeason;
}

export const useTrendGraphData = ({
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
      return FetchTrendGraphData(option, resolvedLocationId, season);
    },
    queryKey: queryKeys.trendGraph(resolvedLocationId, option, season),
    staleTime: STALE_TIME_MS,
  });
};
