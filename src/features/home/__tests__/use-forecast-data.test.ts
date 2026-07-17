import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useForecastData } from "../hooks/use-forecast-data";

vi.mock("@/lib/api/fetch-client", () => ({
  FetchForecastData: mockFn(),
}));

vi.mock("@/lib/api/query-client", () => ({
  queryKeys: {
    forecast: (
      locationId: number,
      yearsAhead: number,
      filters: { basis?: string; option?: string; season?: string } = {},
    ) => [
      "forecast",
      locationId,
      yearsAhead,
      filters.season ?? "Annual",
      filters.option ?? "avg",
      filters.basis ?? "max",
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

describe("useForecastData", () => {
  let mockFetchForecastData: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { FetchForecastData } = await import("@/lib/api/fetch-client");
    mockFetchForecastData = vi.mocked(FetchForecastData);
  });

  it("does not fetch when locationId is undefined", () => {
    const { result } = renderHook(
      () =>
        useForecastData({
          locationId: undefined,
          option: "avg",
          season: "Annual",
          yearsAhead: 10,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchForecastData).not.toHaveBeenCalled();
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(
      () =>
        useForecastData({
          locationId: 123,
          option: "avg",
          season: "Annual",
          yearsAhead: 10,
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchForecastData).not.toHaveBeenCalled();
  });

  it("fetches data when locationId is provided and enabled is true", async () => {
    const mockData = {
      forecastValues: [30, 31],
      forecastYears: [2026, 2027],
      lowerBound10: [28, 29],
      upperBound90: [32, 33],
    };
    mockFetchForecastData.mockResolvedValue(mockData);

    const { result } = renderHook(
      () =>
        useForecastData({
          locationId: 123,
          option: "avg",
          season: "Annual",
          yearsAhead: 10,
          enabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchForecastData).toHaveBeenCalledWith(123, 10, {
      basis: "max",
      option: "avg",
      season: "Annual",
    });
    expect(result.current.data).toStrictEqual(mockData);
  });

  it("handles fetch errors correctly", async () => {
    const mockError = new Error("Forecast fetch failed");
    mockFetchForecastData.mockRejectedValue(mockError);

    const { result } = renderHook(
      () =>
        useForecastData({
          locationId: 123,
          option: "avg",
          season: "Annual",
          yearsAhead: 10,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toStrictEqual(mockError);
  });

  it("updates when enabled toggles from false to true", async () => {
    const mockData = {
      forecastValues: [30],
      forecastYears: [2026],
      lowerBound10: [28],
      upperBound90: [32],
    };
    mockFetchForecastData.mockResolvedValue(mockData);

    const { rerender, result } = renderHook(
      ({ enabled }) =>
        useForecastData({
          locationId: 123,
          option: "avg",
          season: "Annual",
          yearsAhead: 10,
          enabled,
        }),
      {
        initialProps: { enabled: false },
        wrapper: createWrapper(),
      },
    );

    expect(mockFetchForecastData).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchForecastData).toHaveBeenCalledWith(123, 10, {
      basis: "max",
      option: "avg",
      season: "Annual",
    });
  });

  it("updates when yearsAhead changes", async () => {
    const mockData1 = {
      forecastValues: [30],
      forecastYears: [2026],
      lowerBound10: [28],
      upperBound90: [32],
    };
    const mockData2 = {
      forecastValues: [35],
      forecastYears: [2050],
      lowerBound10: [33],
      upperBound90: [37],
    };
    mockFetchForecastData.mockResolvedValueOnce(mockData1);
    mockFetchForecastData.mockResolvedValueOnce(mockData2);

    const { rerender, result } = renderHook(
      ({ yearsAhead }) =>
        useForecastData({
          locationId: 123,
          option: "avg",
          season: "Annual",
          yearsAhead,
        }),
      {
        initialProps: { yearsAhead: 10 },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.data).toStrictEqual(mockData1);
    });

    rerender({ yearsAhead: 25 });

    await waitFor(() => {
      expect(result.current.data).toStrictEqual(mockData2);
    });

    expect(mockFetchForecastData).toHaveBeenNthCalledWith(1, 123, 10, {
      basis: "max",
      option: "avg",
      season: "Annual",
    });
    expect(mockFetchForecastData).toHaveBeenNthCalledWith(2, 123, 25, {
      basis: "max",
      option: "avg",
      season: "Annual",
    });
  });
});
