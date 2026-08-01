import { DatabaseError } from "@/lib/utils/errors";
import { clearAllMocks, setupApiServerTest } from "@/testing/test-utilities";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FetchCityRankings as FetchCityRankingsFunction,
  FetchForecastData as FetchForecastDataFunction,
  FetchLocations as FetchLocationsFunction,
  FetchReferenceGraphData as FetchReferenceGraphDataFunction,
  FetchTrendGraphData as FetchTrendGraphDataFunction,
} from "../fetch-server";
import type * as SchemasModule from "@/lib/api/schemas";
import type {
  createMockLinearRegression,
  createMockValidation,
} from "@/testing/mocks";

interface FetchServerModule {
  FetchCityRankings: typeof FetchCityRankingsFunction;
  FetchForecastData: typeof FetchForecastDataFunction;
  FetchLocations: typeof FetchLocationsFunction;
  FetchReferenceGraphData: typeof FetchReferenceGraphDataFunction;
  FetchTrendGraphData: typeof FetchTrendGraphDataFunction;
}

describe("fetch-server", () => {
  let fetchServer: FetchServerModule;
  let mockDbQueries: Awaited<
    ReturnType<typeof setupApiServerTest>
  >["mockDbQueries"];
  let mockLinearRegression: ReturnType<typeof createMockLinearRegression>;
  let mockValidation: ReturnType<typeof createMockValidation>;

  beforeEach(async () => {
    vi.resetModules();
    clearAllMocks();

    const setup = await setupApiServerTest();
    mockDbQueries = setup.mockDbQueries;
    mockLinearRegression = setup.mockLinearRegression;
    mockValidation = setup.mockValidation;

    fetchServer = await import("../fetch-server");
  });

  describe("fetchCityRankings", () => {
    it("fetches and ranks city data successfully", async () => {
      mockDbQueries.fetchCityRankingsRows.mockResolvedValue([
        {
          avg_wetbulb: 35.5,
          change_from_2000: 1.5,
          city: "Phoenix",
          future_lower: 38,
          future_upper: 42,
          location_id: 1,
          max_wetbulb: 40.5,
          p5: 31,
          p95: 39,
          state: "Arizona",
          year: 2024,
        },
        {
          avg_wetbulb: 30.2,
          change_from_2000: 1.2,
          city: "Austin",
          future_lower: 33,
          future_upper: 37,
          location_id: 2,
          max_wetbulb: 38.2,
          p5: 27,
          p95: 35,
          state: "Texas",
          year: 2024,
        },
      ]);

      const result = await fetchServer.FetchCityRankings(2024);

      expect(mockDbQueries.fetchCityRankingsRows).toHaveBeenCalledWith(
        2024,
        "Annual",
        "max",
        "na",
      );
      expect(result[0]).toStrictEqual({
        avg_wetbulb: 35.5,
        changeFrom2000: 1.5,
        city: "Phoenix",
        FutureValueLower: 38,
        FutureValueUpper: 42,
        location_id: 1,
        max_wetbulb: 40.5,
        p5: 31,
        p95: 39,
        rank: 1,
        state: "Arizona",
      });
      expect(result[1]).toMatchObject({ location_id: 2, rank: 2 });
    });

    it("throws for an invalid year", async () => {
      await expect(fetchServer.FetchCityRankings(1999)).rejects.toThrow(
        new DatabaseError("Invalid year: 1999. Must be between 2000 and 2100."),
      );
    });

    it("wraps database failures", async () => {
      const mockError = new Error("Database connection failed");
      mockDbQueries.fetchCityRankingsRows.mockRejectedValue(mockError);

      await expect(fetchServer.FetchCityRankings(2024)).rejects.toThrow(
        new DatabaseError(
          "Failed to fetch city rankings from database",
          mockError,
        ),
      );
    });
  });

  describe("fetchLocations", () => {
    it("fetches and formats location data successfully", async () => {
      mockDbQueries.fetchLocationRows.mockResolvedValue([
        {
          city: "Boston",
          id: 1,
          lat: 42.3601,
          lng: -71.0589,
          state: "Massachusetts",
        },
        {
          city: "Cambridge",
          id: 2,
          lat: 42.3736,
          lng: -71.1097,
          state: "Massachusetts",
        },
        {
          city: "Austin",
          id: 3,
          lat: 30.2672,
          lng: -97.7431,
          state: "Texas",
        },
      ]);

      const result = await fetchServer.FetchLocations();

      expect(mockDbQueries.fetchLocationRows).toHaveBeenCalledWith("id", "na");
      expect(result.locations).toStrictEqual([
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 1,
          state: "Massachusetts",
        },
        {
          city: "Cambridge",
          lat: 42.3736,
          lng: -71.1097,
          location_id: 2,
          state: "Massachusetts",
        },
        {
          city: "Austin",
          lat: 30.2672,
          lng: -97.7431,
          location_id: 3,
          state: "Texas",
        },
      ]);
      expect(result.LocationOptions).toStrictEqual([
        {
          items: [
            { key: 1, title: "Boston" },
            { key: 2, title: "Cambridge" },
          ],
          title: "Massachusetts",
        },
        {
          items: [{ key: 3, title: "Austin" }],
          title: "Texas",
        },
      ]);
    });

    it("accepts legacy location_id rows", async () => {
      mockDbQueries.fetchLocationRows.mockResolvedValue([
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 1,
          state: "Massachusetts",
        },
      ]);

      const result = await fetchServer.FetchLocations();

      expect(result.locations).toStrictEqual([
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 1,
          state: "Massachusetts",
        },
      ]);
    });

    it("ignores locations with negative ids while keeping zero", async () => {
      mockDbQueries.fetchLocationRows.mockResolvedValue([
        {
          city: "New York",
          id: 0,
          lat: 40.7128,
          lng: -74.006,
          state: "New York",
        },
        {
          city: "Invalid City",
          id: -1,
          lat: 0,
          lng: 0,
          state: "Nowhere",
        },
        {
          city: "Boston",
          id: 1,
          lat: 42.3601,
          lng: -71.0589,
          state: "Massachusetts",
        },
      ]);

      const result = await fetchServer.FetchLocations();

      expect(result.locations).toStrictEqual([
        {
          city: "New York",
          lat: 40.7128,
          lng: -74.006,
          location_id: 0,
          state: "New York",
        },
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 1,
          state: "Massachusetts",
        },
      ]);
    });

    it("wraps database failures", async () => {
      const mockError = new Error("Database connection failed");
      mockDbQueries.fetchLocationRows.mockRejectedValue(mockError);

      await expect(fetchServer.FetchLocations()).rejects.toThrow(
        new DatabaseError(
          "Failed to fetch location data from database",
          mockError,
        ),
      );
    });

    it("wraps schema validation failures as a DatabaseError", async () => {
      mockDbQueries.fetchLocationRows.mockResolvedValue([
        {
          city: "",
          id: 1,
          lat: 42.3601,
          lng: -71.0589,
          state: "Massachusetts",
        },
      ]);

      await expect(fetchServer.FetchLocations()).rejects.toThrow(
        "Locations response validation failed",
      );
    });

    it("rethrows non-schema-validation errors from parsing unchanged", async () => {
      vi.resetModules();
      clearAllMocks();

      vi.doMock("@/lib/api/schemas", async () => {
        const actual =
          await vi.importActual<typeof SchemasModule>("@/lib/api/schemas");

        return {
          ...actual,
          // noinspection JSUnusedGlobalSymbols -- overrides the mocked module member
          parseLocationRows: () => {
            throw new Error("Boom");
          },
        };
      });

      const setup = await setupApiServerTest();
      setup.mockDbQueries.fetchLocationRows.mockResolvedValue([
        {
          city: "Boston",
          id: 1,
          lat: 42.3601,
          lng: -71.0589,
          state: "Massachusetts",
        },
      ]);

      const freshFetchServer = await import("../fetch-server");

      await expect(freshFetchServer.FetchLocations()).rejects.toThrow("Boom");

      vi.doUnmock("@/lib/api/schemas");
    });
  });

  describe("fetchReferenceGraphData", () => {
    it("throws for invalid input", async () => {
      mockValidation.validateLocationId.mockReturnValue(false);

      await expect(
        fetchServer.FetchReferenceGraphData("2023", -1),
      ).rejects.toThrow(new DatabaseError("Invalid locationId: -1"));

      mockValidation.validateLocationId.mockReturnValue(true);
      mockValidation.validateYear.mockReturnValue(false);

      await expect(
        fetchServer.FetchReferenceGraphData("abc", 1),
      ).rejects.toThrow(
        new DatabaseError("Invalid year format: abc. Must be a 4-digit year."),
      );
    });

    it("fetches reference graph data successfully", async () => {
      mockDbQueries.fetchReferenceGraphRows.mockResolvedValue([
        { date: "2023-01-01", location_id: 5, wetbulb: 25.5 },
        { date: "2023-01-02", location_id: 5, wetbulb: 26.2 },
      ]);

      const result = await fetchServer.FetchReferenceGraphData("2023", 5);

      expect(mockDbQueries.fetchReferenceGraphRows).toHaveBeenCalledWith(
        5,
        "2023",
        "max",
      );
      expect(result).toStrictEqual({
        dates: [new Date("2023-01-01"), new Date("2023-01-02")],
        wetbulbs: [25.5, 26.2],
      });
    });

    it("wraps database failures", async () => {
      const mockError = new Error("Database connection failed");
      mockDbQueries.fetchReferenceGraphRows.mockRejectedValue(mockError);

      await expect(
        fetchServer.FetchReferenceGraphData("2023", 1),
      ).rejects.toThrow(
        new DatabaseError(
          "Failed to fetch reference graph data from database",
          mockError,
        ),
      );
    });
  });

  describe("fetchTrendGraphData", () => {
    it("fetches trend data successfully", async () => {
      mockDbQueries.fetchTrendGraphRows.mockResolvedValue([
        { location_id: 1, wetbulb: 25.5, year: 2020 },
        { location_id: 1, wetbulb: 26.2, year: 2021 },
      ]);
      mockLinearRegression.predict.mockImplementation(
        (year: number) => year * 0.7 + 24,
      );

      const result = await fetchServer.FetchTrendGraphData("avg", 1);

      expect(mockDbQueries.fetchTrendGraphRows).toHaveBeenCalledWith(
        1,
        "avg",
        "Annual",
        "max",
      );
      expect(result.years).toStrictEqual([2020, 2021]);
      expect(result.year_wetbulbs).toStrictEqual([25.5, 26.2]);
      expect(result.trendline_wetbulbs[0]).toBeCloseTo(1438, 0);
      expect(result.trendline_wetbulbs[1]).toBeCloseTo(1438.7, 0);
    });

    it("throws for invalid input", async () => {
      mockValidation.validateLocationId.mockReturnValue(false);

      await expect(fetchServer.FetchTrendGraphData("avg", -1)).rejects.toThrow(
        new DatabaseError("Invalid locationId: -1"),
      );

      mockValidation.validateLocationId.mockReturnValue(true);
      mockValidation.validateTrendOption.mockReturnValue(false);

      await expect(
        fetchServer.FetchTrendGraphData("invalid", 1),
      ).rejects.toThrow(
        new DatabaseError("Invalid option: invalid. Must be 'avg' or 'max'"),
      );
    });

    it("returns empty graph data when no rows are found", async () => {
      mockDbQueries.fetchTrendGraphRows.mockResolvedValue([]);

      const result = await fetchServer.FetchTrendGraphData("avg", 1);

      expect(result).toStrictEqual({
        increase_per_year: 0,
        trendline_wetbulbs: [],
        year_wetbulbs: [],
        years: [],
      });
    });

    it("wraps database failures", async () => {
      const mockError = new Error("Database connection failed");
      mockDbQueries.fetchTrendGraphRows.mockRejectedValue(mockError);

      await expect(fetchServer.FetchTrendGraphData("avg", 1)).rejects.toThrow(
        new DatabaseError(
          "Failed to fetch trend graph data from database",
          mockError,
        ),
      );
    });
  });

  describe("fetchForecastData", () => {
    it("fetches forecast data successfully", async () => {
      mockDbQueries.fetchHistoricalYearRow.mockResolvedValue({ year: 2025 });
      mockDbQueries.fetchForecastRows.mockResolvedValue([
        { lower: 28.5, wetbulb: 30.5, upper: 32.5, year: 2026 },
        { lower: 29, wetbulb: 31, upper: 33, year: 2027 },
      ]);

      const result = await fetchServer.FetchForecastData(1, 10);

      expect(mockDbQueries.fetchHistoricalYearRow).toHaveBeenCalledWith(
        1,
        "Annual",
      );
      expect(mockDbQueries.fetchForecastRows).toHaveBeenCalledWith(
        1,
        { lastHistoricalYear: 2025, targetYear: 2035 },
        {
          basis: "max",
          option: "avg",
          scenario: "ssp245",
          season: "Annual",
        },
      );
      expect(result).toStrictEqual({
        forecastValues: [30.5, 31],
        forecastYears: [2026, 2027],
        lowerBound10: [28.5, 29],
        upperBound90: [32.5, 33],
        scenario: "ssp245",
      });
    });

    it("supports seasonal forecasts", async () => {
      mockDbQueries.fetchHistoricalYearRow.mockResolvedValue({ year: 2025 });
      mockDbQueries.fetchForecastRows.mockResolvedValue([
        { lower: 10.5, wetbulb: 12.5, upper: 14.5, year: 2026 },
      ]);

      await fetchServer.FetchForecastData(1, 10, { season: "Winter" });

      expect(mockDbQueries.fetchHistoricalYearRow).toHaveBeenCalledWith(
        1,
        "Winter",
      );
      expect(mockDbQueries.fetchForecastRows).toHaveBeenCalledWith(
        1,
        { lastHistoricalYear: 2025, targetYear: 2035 },
        {
          basis: "max",
          option: "avg",
          scenario: "ssp245",
          season: "Winter",
        },
      );
    });

    it("returns undefined when there is no historical data", async () => {
      mockDbQueries.fetchHistoricalYearRow.mockResolvedValue(null as any);

      await expect(
        fetchServer.FetchForecastData(1, 10),
      ).resolves.toBeUndefined();
    });

    it("returns undefined when there is no forecast data", async () => {
      mockDbQueries.fetchHistoricalYearRow.mockResolvedValue({ year: 2025 });
      mockDbQueries.fetchForecastRows.mockResolvedValue([]);

      await expect(
        fetchServer.FetchForecastData(1, 10),
      ).resolves.toBeUndefined();
    });

    it("wraps database failures", async () => {
      const mockError = new Error("Database connection failed");
      mockDbQueries.fetchHistoricalYearRow.mockRejectedValue(mockError);

      await expect(fetchServer.FetchForecastData(1, 10)).rejects.toThrow(
        new DatabaseError(
          "Failed to fetch forecast data from database",
          mockError,
        ),
      );
    });
  });
});
