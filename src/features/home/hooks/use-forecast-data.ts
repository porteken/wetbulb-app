import { queryKeys } from "@/lib/api/query-client";
import { DEFAULT_GRAPH_SEASON, type GraphSeason } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";

import type { ForecastGraphData } from "@/lib/utils/trend-analysis";

const STALE_TIME_MS = 1000 * 60 * 5;

interface UseForecastDataOptions {
  enabled?: boolean;
  initialData?: ForecastGraphData;
  locationId: number | undefined;
  option: string;
  season?: GraphSeason;
  yearsAhead: number;
}

export const useForecastData = ({
  enabled = true,
  initialData,
  locationId,
  option,
  season = DEFAULT_GRAPH_SEASON,
  yearsAhead,
}: UseForecastDataOptions) => {
  const resolvedLocationId = locationId ?? 0;

  return useQuery({
    enabled: locationId !== undefined && enabled,
    initialData,
    queryFn: async () => {
      const { FetchForecastData } = await import("@/lib/api/fetch-client");
      const data = await FetchForecastData(
        resolvedLocationId,
        yearsAhead,
        season,
        option,
      );

      // React Query forbids resolving undefined; null marks "no forecast
      // available" (e.g. locations without enough complete years of data).
      return data ?? null;
    },
    queryKey: queryKeys.forecast(
      resolvedLocationId,
      yearsAhead,
      season,
      option,
    ),
    staleTime: STALE_TIME_MS,
  });
};
