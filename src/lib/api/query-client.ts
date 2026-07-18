"use client";

import {
  DEFAULT_GRAPH_SEASON,
  DEFAULT_FORECAST_SCENARIO,
  DEFAULT_WETBULB_BASIS,
  type GraphSeason,
  type ForecastScenario,
  type WetbulbBasis,
} from "@/lib/constants";
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

interface ForecastQueryKeyFilters {
  basis?: WetbulbBasis;
  option?: string;
  season?: GraphSeason;
  scenario?: ForecastScenario;
}

export const queryKeys = {
  forecast: (
    locationId: number,
    yearsAhead: number,
    filters: ForecastQueryKeyFilters = {},
  ) => {
    const {
      basis = DEFAULT_WETBULB_BASIS,
      option = "avg",
      scenario = DEFAULT_FORECAST_SCENARIO,
      season = DEFAULT_GRAPH_SEASON,
    } = filters;

    return [
      "forecast",
      locationId,
      yearsAhead,
      season,
      option,
      basis,
      scenario,
    ] as const;
  },
  referenceGraph: (
    locationId: number,
    year: string,
    season: GraphSeason = DEFAULT_GRAPH_SEASON,
  ) => ["reference-graph", locationId, year, season] as const,
  trendGraph: (
    locationId: number,
    option: string,
    season: GraphSeason = DEFAULT_GRAPH_SEASON,
    basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
  ) => ["trend-graph", locationId, option, season, basis] as const,
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
  basis: WetbulbBasis = DEFAULT_WETBULB_BASIS,
) => ({
  queryFn: () => FetchTrendGraphData(option, locationId, season, basis),
  queryKey: queryKeys.trendGraph(locationId, option, season, basis),
});

interface TrendGraphPrefetchFilters {
  basis?: WetbulbBasis;
  season?: GraphSeason;
}

export const prefetchTrendGraphData = (
  queryClient: QueryClient,
  locationId: number,
  option: string,
  filters: TrendGraphPrefetchFilters = {},
) => {
  const { basis = DEFAULT_WETBULB_BASIS, season = DEFAULT_GRAPH_SEASON } =
    filters;

  return queryClient.prefetchQuery({
    ...getTrendGraphQueryOptions(locationId, option, season, basis),
  });
};

export const invalidateTrendGraphData = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: ["trend-graph"],
  });
