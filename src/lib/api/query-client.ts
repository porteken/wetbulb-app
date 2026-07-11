"use client";

import { DEFAULT_GRAPH_SEASON, type GraphSeason } from "@/lib/constants";
import { QueryClient } from "@tanstack/react-query";

import { FetchReferenceGraphData, FetchTrendGraphData } from "./fetch-client";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 1000 * 60 * 5,
      },
    },
  });

export const queryKeys = {
  forecast: (
    locationId: number,
    yearsAhead: number,
    season: GraphSeason = DEFAULT_GRAPH_SEASON,
    option = "avg",
  ) => ["forecast", locationId, yearsAhead, season, option] as const,
  referenceGraph: (
    locationId: number,
    year: string,
    season: GraphSeason = DEFAULT_GRAPH_SEASON,
  ) => ["reference-graph", locationId, year, season] as const,
  trendGraph: (
    locationId: number,
    option: string,
    season: GraphSeason = DEFAULT_GRAPH_SEASON,
  ) => ["trend-graph", locationId, option, season] as const,
};

export const getReferenceGraphQueryOptions = (
  locationId: number,
  year: string,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
) => ({
  queryFn: () => FetchReferenceGraphData(year, locationId, season),
  queryKey: queryKeys.referenceGraph(locationId, year, season),
});

export const getTrendGraphQueryOptions = (
  locationId: number,
  option: string,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
) => ({
  queryFn: () => FetchTrendGraphData(option, locationId, season),
  queryKey: queryKeys.trendGraph(locationId, option, season),
});

export const prefetchTrendGraphData = (
  queryClient: QueryClient,
  locationId: number,
  option: string,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
) =>
  queryClient.prefetchQuery({
    ...getTrendGraphQueryOptions(locationId, option, season),
  });

export const invalidateTrendGraphData = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: ["trend-graph"],
  });
