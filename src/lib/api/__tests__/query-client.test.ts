import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createQueryClient,
  getTrendGraphQueryOptions,
  invalidateTrendGraphData,
  prefetchTrendGraphData,
  queryKeys,
} from "../query-client";

vi.mock("../fetch-client", () => ({
  FetchTrendGraphData: mockFn(),
}));

async function getMockFetchTrendGraphData() {
  const fetchClient = await import("../fetch-client");
  return vi.mocked(fetchClient.FetchTrendGraphData);
}

describe("createQueryClient", () => {
  it("creates a query client with expected defaults", () => {
    const queryClient = createQueryClient();

    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1);
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(300_000);
  });
});

describe("queryKeys", () => {
  it("builds stable trend graph query keys", () => {
    expect(queryKeys.trendGraph(123, "avg")).toStrictEqual([
      "trend-graph",
      123,
      "avg",
      "Annual",
      "max",
    ]);
    expect(queryKeys.trendGraph(123, "avg")).toStrictEqual([
      "trend-graph",
      123,
      "avg",
      "Annual",
      "max",
    ]);
    expect(queryKeys.trendGraph(999, "max")).toStrictEqual([
      "trend-graph",
      999,
      "max",
      "Annual",
      "max",
    ]);
  });

  it("builds stable forecast query keys", () => {
    expect(
      queryKeys.forecast(123, 10, { option: "max", season: "Winter" }),
    ).toStrictEqual(["forecast", 123, 10, "Winter", "max", "max", "ssp245"]);
    expect(queryKeys.forecast(123, 10)).toStrictEqual([
      "forecast",
      123,
      10,
      "Annual",
      "avg",
      "max",
      "ssp245",
    ]);
  });
});

describe("getTrendGraphQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a query function and query key", () => {
    const options = getTrendGraphQueryOptions(44, "avg");

    expect(options.queryKey).toStrictEqual([
      "trend-graph",
      44,
      "avg",
      "Annual",
      "max",
    ]);
    expect(options.queryFn).toBeTypeOf("function");
  });

  it("query function delegates to FetchTrendGraphData", async () => {
    const mockData = {
      increase_per_year: 0.5,
      trendline_wetbulbs: [1, 2, 3],
      year_wetbulbs: [10, 20, 30],
      years: [2020, 2021, 2022],
    };
    const mockFetchTrendGraphData = await getMockFetchTrendGraphData();
    mockFetchTrendGraphData.mockResolvedValue(mockData);

    const options = getTrendGraphQueryOptions(55, "max");
    const result = await options.queryFn();

    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "max",
      55,
      "Annual",
      "max",
    );
    expect(result).toStrictEqual(mockData);
  });
});

describe("prefetch/invalidate helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetchTrendGraphData forwards to queryClient.prefetchQuery", async () => {
    const queryClient = createQueryClient();
    const prefetchSpy = vi
      .spyOn(queryClient, "prefetchQuery")
      .mockResolvedValue();

    await prefetchTrendGraphData(queryClient, 77, "avg");

    expect(prefetchSpy).toHaveBeenCalledWith({
      queryFn: expect.any(Function),
      queryKey: ["trend-graph", 77, "avg", "Annual", "max"],
    });
  });

  it("invalidateTrendGraphData forwards to queryClient.invalidateQueries", async () => {
    const queryClient = createQueryClient();
    const invalidateSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();

    await invalidateTrendGraphData(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["trend-graph"],
    });
  });
});
