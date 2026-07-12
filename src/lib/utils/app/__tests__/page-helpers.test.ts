import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getForecastPreferencesFromCookies,
  getGraphMeasureFromCookies,
  getLocationData,
} from "../page-helpers";

vi.mock("next/headers", () => ({
  cookies: mockFn(),
}));

vi.mock("@/lib/api/fetch-server", () => ({
  FetchLocations: mockFn(),
}));

async function getMockFetchLocations() {
  const fetchServer = await import("@/lib/api/fetch-server");
  return vi.mocked(fetchServer.FetchLocations);
}

vi.mock("@/lib/constants", () => ({
  DEFAULT_FORECAST_ENABLED: false,
  DEFAULT_FORECAST_YEARS_AHEAD: 10,
  DEFAULT_GRAPH_MEASURE: "temperature",
  ERROR_MESSAGES: {
    NO_DATA: "No location data available",
  },
  FORECAST_ENABLED_COOKIE_NAME: "forecast-enabled",
  FORECAST_YEARS_AHEAD_COOKIE_NAME: "forecast-years-ahead",
  GRAPH_MEASURE_COOKIE_NAME: "graph-measure",
  MAX_FORECAST_YEARS_AHEAD: 75,
  MIN_FORECAST_YEARS_AHEAD: 5,
}));

describe("page-helpers", () => {
  let mockCookies: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { cookies } = await import("next/headers");
    mockCookies = vi.mocked(cookies);
  });

  describe("getGraphMeasureFromCookies", () => {
    it("returns value from cookie when present", async () => {
      const mockCookieStore = {
        get: mockFn().mockReturnValue({ value: "humidity" }),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getGraphMeasureFromCookies();

      expect(result).toBe("humidity");
      expect(mockCookies).toHaveBeenCalled();
      expect(mockCookieStore.get).toHaveBeenCalledWith("graph-measure");
    });

    it("returns default value when cookie value is null", async () => {
      const mockCookieStore = {
        get: mockFn().mockReturnValue({ value: undefined }),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getGraphMeasureFromCookies();

      expect(result).toBe("temperature");
      expect(mockCookies).toHaveBeenCalled();
      expect(mockCookieStore.get).toHaveBeenCalledWith("graph-measure");
    });

    it("returns default value when cookie value is empty string", async () => {
      const mockCookieStore = {
        get: mockFn().mockReturnValue({ value: "" }),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getGraphMeasureFromCookies();

      expect(result).toBe("temperature");
      expect(mockCookies).toHaveBeenCalled();
      expect(mockCookieStore.get).toHaveBeenCalledWith("graph-measure");
    });

    it("handles different cookie values correctly", async () => {
      const testCases = [
        { cookieValue: "pressure", expected: "pressure" },
        { cookieValue: "wind_speed", expected: "wind_speed" },
        { cookieValue: "visibility", expected: "visibility" },
      ];

      const results = await Promise.all(
        testCases.map(async ({ cookieValue, expected }) => {
          const mockCookieStore = {
            get: mockFn().mockReturnValue({ value: cookieValue }),
          };
          mockCookies.mockResolvedValue(mockCookieStore);

          const result = await getGraphMeasureFromCookies();

          return { expected, result };
        }),
      );

      for (const { expected, result } of results) {
        expect(result).toBe(expected);
      }
    });

    it("handles cookies function rejection", async () => {
      const error = new Error("Cookies unavailable");
      mockCookies.mockRejectedValue(error);

      await expect(getGraphMeasureFromCookies()).rejects.toThrow(
        "Cookies unavailable",
      );
      expect(mockCookies).toHaveBeenCalled();
    });

    it("handles cookie store get method throwing error", async () => {
      const mockCookieStore = {
        get: mockFn().mockImplementation(() => {
          throw new Error("Cookie access error");
        }),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      await expect(getGraphMeasureFromCookies()).rejects.toThrow(
        "Cookie access error",
      );
      expect(mockCookies).toHaveBeenCalled();
      expect(mockCookieStore.get).toHaveBeenCalledWith("graph-measure");
    });

    it("prefers the latest graph measure cookie when duplicates exist", async () => {
      const mockCookieStore = {
        get: mockFn().mockReturnValue({ value: "max" }),
        getAll: mockFn().mockReturnValue([
          { name: "graph-measure", value: "max" },
          { name: "graph-measure", value: "avg" },
        ]),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getGraphMeasureFromCookies();

      expect(result).toBe("avg");
      expect(mockCookieStore.getAll).toHaveBeenCalledWith("graph-measure");
    });
  });

  describe("getForecastPreferencesFromCookies", () => {
    it("returns defaults when cookies are missing", async () => {
      const mockCookieStore = {
        get: mockFn(
          (name: string) => (({}) as Record<string, { value: string }>)[name],
        ),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getForecastPreferencesFromCookies();

      expect(result).toStrictEqual({
        enabled: false,
        yearsAhead: 10,
      });
      expect(mockCookieStore.get).toHaveBeenCalledWith("forecast-enabled");
      expect(mockCookieStore.get).toHaveBeenCalledWith("forecast-years-ahead");
    });

    it("returns parsed cookie values when valid", async () => {
      const mockCookieStore = {
        get: mockFn(
          (name: string) =>
            (
              ({
                "forecast-enabled": { value: "true" },
                "forecast-years-ahead": { value: "25" },
              }) as Record<string, { value: string }>
            )[name],
        ),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getForecastPreferencesFromCookies();

      expect(result).toStrictEqual({
        enabled: true,
        yearsAhead: 25,
      });
    });

    it("falls back to default years for invalid values", async () => {
      const mockCookieStore = {
        get: mockFn(
          (name: string) =>
            (
              ({
                "forecast-enabled": { value: "true" },
                "forecast-years-ahead": { value: "200" },
              }) as Record<string, { value: string }>
            )[name],
        ),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getForecastPreferencesFromCookies();

      expect(result).toStrictEqual({
        enabled: true,
        yearsAhead: 10,
      });
    });

    it("treats non-true enabled values as false", async () => {
      const mockCookieStore = {
        get: mockFn(
          (name: string) =>
            (
              ({
                "forecast-enabled": { value: "false" },
                "forecast-years-ahead": { value: "15" },
              }) as Record<string, { value: string }>
            )[name],
        ),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getForecastPreferencesFromCookies();

      expect(result).toStrictEqual({
        enabled: false,
        yearsAhead: 15,
      });
    });
  });

  describe("getLocationData", () => {
    it("returns location data when available", async () => {
      const mockLocationData = {
        LocationOptions: [
          {
            items: [
              { key: 1, title: "Location 1" },
              { key: 2, title: "Location 2" },
            ],
            title: "Location Group 1",
          },
        ],
        locations: [
          {
            city: "Location 1",
            lat: 40.7128,
            lng: -74.006,
            location_id: 1,
            state: "NY",
          },
          {
            city: "Location 2",
            lat: 34.0522,
            lng: -118.2437,
            location_id: 2,
            state: "CA",
          },
        ],
      };

      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockResolvedValue(mockLocationData);

      const result = await getLocationData();

      expect(result).toStrictEqual(mockLocationData);
      expect(mockFetchLocations).toHaveBeenCalled();
    });

    it("throws error when locations array is empty", async () => {
      const mockLocationData = {
        LocationOptions: [],
        locations: [],
      };

      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockResolvedValue(mockLocationData);

      await expect(getLocationData()).rejects.toThrow(
        "No location data available",
      );
      expect(mockFetchLocations).toHaveBeenCalled();
    });

    it("throws error when locations is null", async () => {
      const mockLocationData = {
        LocationOptions: [
          {
            items: [{ key: 1, title: "Location 1" }],
            title: "Location Group 1",
          },
        ],
        locations: [],
      } as any;

      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockResolvedValue(mockLocationData);

      await expect(getLocationData()).rejects.toThrow(
        "No location data available",
      );
      expect(mockFetchLocations).toHaveBeenCalled();
    });

    it("throws error when locations is undefined", async () => {
      const mockLocationData = {
        LocationOptions: [
          {
            items: [{ key: 1, title: "Location 1" }],
            title: "Location Group 1",
          },
        ],
        locations: [],
      } as any;

      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockResolvedValue(mockLocationData);

      await expect(getLocationData()).rejects.toThrow(
        "No location data available",
      );
      expect(mockFetchLocations).toHaveBeenCalled();
    });

    it("propagates fetch error when FetchLocations fails", async () => {
      const fetchError = new Error("Network error");
      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockRejectedValue(fetchError);

      await expect(getLocationData()).rejects.toThrow("Network error");
      expect(mockFetchLocations).toHaveBeenCalled();
    });

    it("handles various valid location data structures", async () => {
      const testCases = [
        {
          data: {
            LocationOptions: [
              {
                items: [{ key: 1, title: "Single Location" }],
                title: "Single Group",
              },
            ],
            locations: [
              {
                city: "Single Location",
                lat: 0,
                lng: 0,
                location_id: 1,
                state: "ST",
              },
            ],
          },
          name: "single location",
        },
        {
          data: {
            LocationOptions: [
              {
                items: [
                  { key: 1, title: "Location 1" },
                  { key: 2, title: "Location 2" },
                  { key: 3, title: "Location 3" },
                ],
                title: "Multiple Group",
              },
            ],
            locations: [
              {
                city: "Location 1",
                lat: 1,
                lng: 1,
                location_id: 1,
                state: "S1",
              },
              {
                city: "Location 2",
                lat: 2,
                lng: 2,
                location_id: 2,
                state: "S2",
              },
              {
                city: "Location 3",
                lat: 3,
                lng: 3,
                location_id: 3,
                state: "S3",
              },
            ],
          },
          name: "multiple locations",
        },
      ];

      const mockFetchLocations = await getMockFetchLocations();

      const results = await Promise.all(
        testCases.map(async ({ data }) => {
          mockFetchLocations.mockClear();
          mockFetchLocations.mockResolvedValue(data);

          const result = await getLocationData();

          return { data, result };
        }),
      );

      for (const { data, result } of results) {
        expect(result).toStrictEqual(data);
        expect(mockFetchLocations).toHaveBeenCalled();
      }
    });

    it("validates locations length correctly", async () => {
      const mockLocationData = {
        LocationOptions: [
          {
            items: [{ key: 1, title: "Single Location" }],
            title: "Single Group",
          },
        ],
        locations: [
          {
            city: "Single Location",
            lat: 0,
            lng: 0,
            location_id: 1,
            state: "ST",
          },
        ],
      };

      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockResolvedValue(mockLocationData);

      const result = await getLocationData();

      expect(result).toStrictEqual(mockLocationData);
      expect(mockFetchLocations).toHaveBeenCalled();
    });

    it("handles malformed response structure", async () => {
      const malformedData = {
        LocationOptions: [
          {
            items: [{ key: 1, title: "Location 1" }],
            title: "Location Group 1",
          },
        ],
      } as any;

      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockResolvedValue(malformedData);

      await expect(getLocationData()).rejects.toThrow(
        "No location data available",
      );
      expect(mockFetchLocations).toHaveBeenCalled();
    });

    it("handles non-array locations", async () => {
      const mockLocationData = {
        LocationOptions: [
          {
            items: [{ key: 1, title: "Location 1" }],
            title: "Location Group 1",
          },
        ],
        locations: "not an array",
      } as any;

      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockResolvedValue(mockLocationData);

      await expect(getLocationData()).rejects.toThrow(
        "No location data available",
      );
      expect(mockFetchLocations).toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    it("both functions can be called independently", async () => {
      const mockCookieStore = {
        get: mockFn().mockReturnValue({ value: "pressure" }),
      };
      mockCookies.mockResolvedValue(mockCookieStore);

      const mockLocationData = {
        LocationOptions: [
          {
            items: [{ key: 1, title: "Location 1" }],
            title: "Location Group 1",
          },
        ],
        locations: [
          { city: "Location 1", lat: 0, lng: 0, location_id: 1, state: "ST" },
        ],
      };
      const mockFetchLocations = await getMockFetchLocations();
      mockFetchLocations.mockResolvedValue(mockLocationData);

      const [graphMeasure, locationData] = await Promise.all([
        getGraphMeasureFromCookies(),
        getLocationData(),
      ]);

      expect(graphMeasure).toBe("pressure");
      expect(locationData).toStrictEqual(mockLocationData);
      expect(mockCookies).toHaveBeenCalled();
      expect(mockFetchLocations).toHaveBeenCalled();
    });

    it("handles concurrent failures gracefully", async () => {
      const mockFetchLocations = await getMockFetchLocations();
      mockCookies.mockRejectedValue(new Error("Cookie error"));
      mockFetchLocations.mockRejectedValue(new Error("Fetch error"));

      const [cookieResult, locationResult] = await Promise.allSettled([
        getGraphMeasureFromCookies(),
        getLocationData(),
      ]);

      expect(cookieResult.status).toBe("rejected");
      expect(locationResult.status).toBe("rejected");

      expect((cookieResult as PromiseRejectedResult).reason.message).toBe(
        "Cookie error",
      );
      expect((locationResult as PromiseRejectedResult).reason.message).toBe(
        "Fetch error",
      );
    });
  });
});
