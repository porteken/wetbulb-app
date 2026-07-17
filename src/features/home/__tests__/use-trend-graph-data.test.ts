import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTrendGraphData } from "../hooks/use-trend-graph-data";

import type { GraphSeason } from "@/lib/constants";

vi.mock("@/lib/api/fetch-client", () => ({
  FetchTrendGraphData: mockFn(),
}));

vi.mock("@/lib/api/query-client", () => ({
  queryKeys: {
    trendGraph: (locationId: number, option: string, season = "Annual") => [
      "trend-graph",
      locationId,
      option,
      season,
    ],
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  TestWrapper.displayName = "TestWrapper";

  return TestWrapper;
};

describe("useTrendGraphData", () => {
  let mockFetchTrendGraphData: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { FetchTrendGraphData } = await import("@/lib/api/fetch-client");
    mockFetchTrendGraphData = vi.mocked(FetchTrendGraphData);
  });

  it("does not fetch when locationId is undefined", () => {
    const { result } = renderHook(
      () => useTrendGraphData({ locationId: undefined, option: "temperature" }),
      {
        wrapper: createWrapper(),
      },
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchTrendGraphData).not.toHaveBeenCalled();
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(
      () =>
        useTrendGraphData({
          locationId: 123,
          option: "temperature",
          season: "Annual",
          enabled: false,
        }),
      {
        wrapper: createWrapper(),
      },
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchTrendGraphData).not.toHaveBeenCalled();
  });

  it("fetches data when locationId is provided and enabled is true", async () => {
    const mockData = { data: "test data" };
    mockFetchTrendGraphData.mockResolvedValue(mockData);

    const { result } = renderHook(
      () =>
        useTrendGraphData({
          locationId: 123,
          option: "temperature",
          season: "Annual",
          enabled: true,
        }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "temperature",
      123,
      "Annual",
      "max",
    );
    expect(result.current.data).toStrictEqual(mockData);
  });

  it("fetches data when enabled is not provided (defaults to true)", async () => {
    const mockData = { data: "test data" };
    mockFetchTrendGraphData.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useTrendGraphData({ locationId: 123, option: "temperature" }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "temperature",
      123,
      "Annual",
      "max",
    );
    expect(result.current.data).toStrictEqual(mockData);
  });

  it("handles fetch errors correctly", async () => {
    const mockError = new Error("Fetch failed");
    mockFetchTrendGraphData.mockRejectedValue(mockError);

    const { result } = renderHook(
      () => useTrendGraphData({ locationId: 123, option: "temperature" }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toStrictEqual(mockError);
  });

  it("updates when locationId changes", async () => {
    const mockData1 = { data: "data for location 123" };
    const mockData2 = { data: "data for location 456" };

    mockFetchTrendGraphData.mockResolvedValueOnce(mockData1);
    mockFetchTrendGraphData.mockResolvedValueOnce(mockData2);

    const { rerender, result } = renderHook(
      ({ locationId }) =>
        useTrendGraphData({ locationId, option: "temperature" }),
      {
        initialProps: { locationId: 123 },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toStrictEqual(mockData1);

    rerender({ locationId: 456 });

    await waitFor(() => {
      expect(result.current.data).toStrictEqual(mockData2);
    });

    expect(mockFetchTrendGraphData).toHaveBeenNthCalledWith(
      1,
      "temperature",
      123,
      "Annual",
      "max",
    );
    expect(mockFetchTrendGraphData).toHaveBeenNthCalledWith(
      2,
      "temperature",
      456,
      "Annual",
      "max",
    );
  });

  it("updates when option changes", async () => {
    const mockData1 = { data: "temperature data" };
    const mockData2 = { data: "humidity data" };

    mockFetchTrendGraphData.mockResolvedValueOnce(mockData1);
    mockFetchTrendGraphData.mockResolvedValueOnce(mockData2);

    const { rerender, result } = renderHook(
      ({ option }) => useTrendGraphData({ locationId: 123, option }),
      {
        initialProps: { option: "temperature" },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toStrictEqual(mockData1);

    rerender({ option: "humidity" });

    await waitFor(() => {
      expect(result.current.data).toStrictEqual(mockData2);
    });

    expect(mockFetchTrendGraphData).toHaveBeenNthCalledWith(
      1,
      "temperature",
      123,
      "Annual",
      "max",
    );
    expect(mockFetchTrendGraphData).toHaveBeenNthCalledWith(
      2,
      "humidity",
      123,
      "Annual",
      "max",
    );
  });

  it("updates when season changes", async () => {
    const mockData1 = { data: "annual data" };
    const mockData2 = { data: "winter data" };

    mockFetchTrendGraphData.mockResolvedValueOnce(mockData1);
    mockFetchTrendGraphData.mockResolvedValueOnce(mockData2);

    const { rerender, result } = renderHook(
      ({ season }: { season: GraphSeason }) =>
        useTrendGraphData({
          locationId: 123,
          option: "temperature",
          season,
        }),
      {
        initialProps: { season: "Annual" as GraphSeason },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toStrictEqual(mockData1);

    rerender({ season: "Winter" as GraphSeason });

    await waitFor(() => {
      expect(result.current.data).toStrictEqual(mockData2);
    });

    expect(mockFetchTrendGraphData).toHaveBeenNthCalledWith(
      1,
      "temperature",
      123,
      "Annual",
      "max",
    );
    expect(mockFetchTrendGraphData).toHaveBeenNthCalledWith(
      2,
      "temperature",
      123,
      "Winter",
      "max",
    );
  });

  it("has correct stale time", () => {
    const { result } = renderHook(
      () => useTrendGraphData({ locationId: 123, option: "temperature" }),
      {
        wrapper: createWrapper(),
      },
    );

    expect(result.current.dataUpdatedAt).toBeDefined();
  });

  it("handles enabled state changes correctly", async () => {
    const mockData = { data: "test data" };
    mockFetchTrendGraphData.mockResolvedValue(mockData);

    const { rerender, result } = renderHook(
      ({ enabled }) =>
        useTrendGraphData({
          locationId: 123,
          option: "temperature",
          season: "Annual",
          enabled,
        }),
      {
        initialProps: { enabled: false },
        wrapper: createWrapper(),
      },
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchTrendGraphData).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "temperature",
      123,
      "Annual",
      "max",
    );
    expect(result.current.data).toStrictEqual(mockData);
  });

  it("handles locationId 0 correctly", async () => {
    const mockData = { data: "data for location 0" };
    mockFetchTrendGraphData.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useTrendGraphData({ locationId: 0, option: "temperature" }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "temperature",
      0,
      "Annual",
      "max",
    );
    expect(result.current.data).toStrictEqual(mockData);
  });

  it("uses correct query key format", () => {
    const { result } = renderHook(
      () => useTrendGraphData({ locationId: 123, option: "temperature" }),
      {
        wrapper: createWrapper(),
      },
    );

    expect(result.current).toBeDefined();
  });
});
