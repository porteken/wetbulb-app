import { FetchError } from "@/lib/utils/errors";
import { clearAllMocks, setupApiClientTest } from "@/testing/test-utilities";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FetchForecastData, FetchTrendGraphData } from "../fetch-client";

import type { createMockValidation } from "@/testing/mocks";

const createJsonResponse = (body: unknown, status = 200) =>
  Response.json(body, { status });

describe("fetchTrendGraphData", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let mockValidation: ReturnType<typeof createMockValidation>;

  beforeEach(async () => {
    clearAllMocks();

    const setup = await setupApiClientTest();
    mockValidation = setup.mockValidation;

    fetchMock = mockFn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("throws FetchError for an invalid trend option", async () => {
    mockValidation.validateTrendOption.mockReturnValue(false);

    await expect(FetchTrendGraphData("invalid", 1)).rejects.toThrow(
      new FetchError("Invalid trend option. Must be 'avg' or 'max'"),
    );
  });

  it("throws FetchError for an invalid location ID", async () => {
    mockValidation.validateLocationId.mockReturnValue(false);

    await expect(FetchTrendGraphData("avg", -1)).rejects.toThrow(
      new FetchError("Invalid location ID: -1"),
    );
  });

  it("fetches trend graph data successfully", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        increase_per_year: 0.7,
        trendline_wetbulbs: [24, 24.7],
        year_wetbulbs: [25.5, 26.2],
        years: [2020, 2021],
      }),
    );

    const result = await FetchTrendGraphData("avg", 1);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data/trend?locationId=1&option=avg&season=Annual",
      expect.objectContaining({
        headers: {
          accept: "application/json",
        },
      }),
    );
    expect(result).toStrictEqual({
      increase_per_year: 0.7,
      trendline_wetbulbs: [24, 24.7],
      year_wetbulbs: [25.5, 26.2],
      years: [2020, 2021],
    });
  });

  it("uses the selected season and option in the request", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        increase_per_year: 1.1,
        trendline_wetbulbs: [30.1],
        year_wetbulbs: [31.2],
        years: [2021],
      }),
    );

    await FetchTrendGraphData("max", 1, "Winter");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data/trend?locationId=1&option=max&season=Winter",
      expect.any(Object),
    );
  });

  it("returns empty graph data when the API returns empty arrays", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        increase_per_year: 0,
        trendline_wetbulbs: [],
        year_wetbulbs: [],
        years: [],
      }),
    );

    await expect(FetchTrendGraphData("avg", 1)).resolves.toStrictEqual({
      increase_per_year: 0,
      trendline_wetbulbs: [],
      year_wetbulbs: [],
      years: [],
    });
  });

  it("surfaces route errors", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({ error: "Database connection failed" }, 500),
    );

    await expect(FetchTrendGraphData("avg", 1)).rejects.toThrow(
      "Failed to fetch trend graph data for location 1 (avg): Database connection failed",
    );
  });

  it("wraps unexpected fetch failures", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    await expect(FetchTrendGraphData("avg", 1)).rejects.toThrow(
      "Failed to fetch trend graph data for location 1 (avg): Network error",
    );
  });

  it("rejects malformed API responses", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        increase_per_year: 0.7,
        trendline_wetbulbs: [24, 24.7],
        year_wetbulbs: ["not-a-number"],
        years: [2020],
      }),
    );

    await expect(FetchTrendGraphData("avg", 1)).rejects.toThrow(
      "response validation failed",
    );
  });
});

describe("fetchForecastData", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let mockValidation: ReturnType<typeof createMockValidation>;

  beforeEach(async () => {
    clearAllMocks();

    const setup = await setupApiClientTest();
    mockValidation = setup.mockValidation;

    fetchMock = mockFn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("throws when called in a non-browser environment", async () => {
    const originalWindow = globalThis.window;

    Reflect.deleteProperty(globalThis, "window");

    await expect(FetchForecastData(1, 10)).rejects.toThrow(
      "FetchForecastData can only be called in browser environment",
    );

    globalThis.window = originalWindow;
  });

  it("throws FetchError for an invalid location ID", async () => {
    mockValidation.validateLocationId.mockReturnValue(false);

    await expect(FetchForecastData(-1, 10)).rejects.toThrow(
      new FetchError("Invalid location ID: -1"),
    );
  });

  it("fetches forecast data successfully", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        forecastValues: [30.5, 31],
        forecastYears: [2026, 2027],
        lowerBound10: [28.5, 29],
        upperBound90: [32.5, 33],
      }),
    );

    const result = await FetchForecastData(1, 10);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data/forecast?locationId=1&option=avg&season=Annual&yearsAhead=10",
      expect.any(Object),
    );
    expect(result).toStrictEqual({
      forecastValues: [30.5, 31],
      forecastYears: [2026, 2027],
      lowerBound10: [28.5, 29],
      upperBound90: [32.5, 33],
    });
  });

  it("requests seasonal forecast data when a season is provided", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        forecastValues: [12.5],
        forecastYears: [2026],
        lowerBound10: [10.5],
        upperBound90: [14.5],
      }),
    );

    await FetchForecastData(1, 10, "Winter");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data/forecast?locationId=1&option=avg&season=Winter&yearsAhead=10",
      expect.any(Object),
    );
  });

  it("returns undefined when the API returns null", async () => {
    fetchMock.mockResolvedValue(createJsonResponse(null));

    await expect(FetchForecastData(1, 10)).resolves.toBeUndefined();
  });

  it("surfaces route errors", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({ error: "Database connection failed" }, 500),
    );

    await expect(FetchForecastData(1, 10)).rejects.toThrow(
      "Failed to fetch forecast data for location 1: Database connection failed",
    );
  });

  it("rejects malformed API responses", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        forecastValues: [30.5],
        forecastYears: [2026],
        lowerBound10: [28.5],
        upperBound90: ["bad"],
      }),
    );

    await expect(FetchForecastData(1, 10)).rejects.toThrow(
      "response validation failed",
    );
  });
});
