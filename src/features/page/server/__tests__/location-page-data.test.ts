import {
  DEFAULT_REFERENCE_YEAR,
  DEFAULT_FORECAST_ENABLED,
  DEFAULT_FORECAST_YEARS_AHEAD,
  DEFAULT_GRAPH_MEASURE,
  DEFAULT_GRAPH_SEASON,
  DEFAULT_WETBULB_BASIS,
  FORECAST_ENABLED_COOKIE_NAME,
  FORECAST_YEARS_AHEAD_COOKIE_NAME,
  GRAPH_MEASURE_COOKIE_NAME,
  GRAPH_SEASON_COOKIE_NAME,
  REFERENCE_YEAR_COOKIE_NAME,
} from "@/lib/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadLocationPageData } from "../location-page-data";

const {
  mockCookies,
  mockFetchForecastData,
  mockFetchLocations,
  mockFetchReferenceGraphData,
  mockFetchTrendGraphData,
} = vi.hoisted(() => ({
  mockCookies: mockFn(),
  mockFetchForecastData: mockFn(),
  mockFetchLocations: mockFn(),
  mockFetchReferenceGraphData: mockFn(),
  mockFetchTrendGraphData: mockFn(),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/api/fetch-server", () => ({
  FetchForecastData: mockFetchForecastData,
  FetchLocations: mockFetchLocations,
  FetchReferenceGraphData: mockFetchReferenceGraphData,
  FetchTrendGraphData: mockFetchTrendGraphData,
}));

const createCookieStore = (
  values: Partial<Record<string, string>>,
  duplicateValues?: Partial<Record<string, string[]>>,
) => ({
  get(name: string) {
    const value = values[name];
    return value ? { value } : undefined;
  },
  ...Object.fromEntries([
    [
      "getAll",
      (name?: string) => {
        if (!name) {
          return [];
        }

        const duplicates = duplicateValues?.[name];

        if (duplicates && duplicates.length > 0) {
          return duplicates.map((value) => ({ name, value }));
        }

        const value = values[name];
        return value ? [{ name, value }] : [];
      },
    ],
  ]),
});

describe("loadLocationPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue(createCookieStore({}));
  });

  it("returns an invalid-location result for a non-numeric id", async () => {
    await expect(loadLocationPageData("abc")).resolves.toStrictEqual({
      payload: {
        message: "The provided location ID is not valid.",
        title: "Invalid location ID",
      },
      status: "invalid-location",
    });

    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockFetchLocations).not.toHaveBeenCalled();
  });

  it("returns a database error when locations cannot be loaded", async () => {
    mockFetchLocations.mockRejectedValue(new Error("offline"));

    await expect(loadLocationPageData("7")).resolves.toStrictEqual({
      payload: {
        message: "Unable to connect to the database. Please try again later.",
        title: "Database Connection Error",
      },
      status: "database-error",
    });
  });

  it("returns a no-data database error when the location list is empty", async () => {
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [],
      locations: [],
    });

    await expect(loadLocationPageData("7")).resolves.toStrictEqual({
      payload: {
        message:
          "Location data could not be loaded. The database may be temporarily unavailable.",
        title: "No Data Available",
      },
      status: "database-error",
    });
  });

  it("returns an invalid-location error when the id is not present", async () => {
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [],
      locations: [
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 3,
          state: "Massachusetts",
        },
      ],
    });

    await expect(loadLocationPageData("7")).resolves.toStrictEqual({
      payload: {
        message: "The requested location could not be found.",
        title: "Location not found",
      },
      status: "invalid-location",
    });
  });

  it("returns the page with empty trend data when trend graph fetching fails", async () => {
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [],
      locations: [
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 7,
          state: "Massachusetts",
        },
      ],
    });
    mockFetchReferenceGraphData
      .mockResolvedValueOnce({
        dates: [new Date("2024-01-01")],
        wetbulbs: [31],
      })
      .mockResolvedValueOnce({
        dates: [new Date("2024-01-01")],
        wetbulbs: [25],
      });
    mockFetchTrendGraphData.mockRejectedValue(new Error("graph failed"));

    await expect(loadLocationPageData("7")).resolves.toStrictEqual({
      payload: {
        CurrentDates: [new Date("2024-01-01")],
        CurrentWetbulbs: [31],
        graphDataError: false,
        IncreasePerYear: 0,
        ReferenceWetbulbs: [25],
        TrendlineWetbulbs: [],
        YearWetbulbs: [],
        Years: [],
        id: 7,
        initialForecastData: undefined,
        initialForecastEnabled: DEFAULT_FORECAST_ENABLED,
        initialForecastYearsAhead: DEFAULT_FORECAST_YEARS_AHEAD,
        initialGraphMeasure: DEFAULT_GRAPH_MEASURE,
        initialGraphSeason: DEFAULT_GRAPH_SEASON,
        initialReferenceYear: DEFAULT_REFERENCE_YEAR,
        initialWetbulbBasis: DEFAULT_WETBULB_BASIS,
        location: {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 7,
          state: "Massachusetts",
        },
        LocationOptions: [],
      },
      status: "success",
    });
  });

  it("returns the page with empty reference data when reference graph fetching fails", async () => {
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [],
      locations: [
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 7,
          state: "Massachusetts",
        },
      ],
    });
    mockFetchTrendGraphData.mockResolvedValue({
      increase_per_year: 0.5,
      trendline_wetbulbs: [28, 29],
      year_wetbulbs: [27, 28],
      years: [2023, 2024],
    });
    mockFetchReferenceGraphData.mockRejectedValue(
      new Error("reference failed"),
    );

    await expect(loadLocationPageData("7")).resolves.toStrictEqual({
      payload: {
        CurrentDates: [],
        CurrentWetbulbs: [],
        graphDataError: false,
        IncreasePerYear: 0.5,
        ReferenceWetbulbs: [],
        TrendlineWetbulbs: [28, 29],
        YearWetbulbs: [27, 28],
        Years: [2023, 2024],
        id: 7,
        initialForecastData: undefined,
        initialForecastEnabled: DEFAULT_FORECAST_ENABLED,
        initialForecastYearsAhead: DEFAULT_FORECAST_YEARS_AHEAD,
        initialGraphMeasure: DEFAULT_GRAPH_MEASURE,
        initialGraphSeason: DEFAULT_GRAPH_SEASON,
        initialReferenceYear: DEFAULT_REFERENCE_YEAR,
        initialWetbulbBasis: DEFAULT_WETBULB_BASIS,
        location: {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 7,
          state: "Massachusetts",
        },
        LocationOptions: [],
      },
      status: "success",
    });
  });

  it("returns the assembled page data using cookie preferences", async () => {
    const currentDates = [new Date("2024-01-01"), new Date("2024-02-01")];
    const locationOptions = [
      {
        items: [{ key: 7, title: "Boston" }],
        title: "Massachusetts",
      },
    ];
    const location = {
      city: "Boston",
      lat: 42.3601,
      lng: -71.0589,
      location_id: 7,
      state: "Massachusetts",
    };

    mockCookies.mockResolvedValue(
      createCookieStore({
        [FORECAST_ENABLED_COOKIE_NAME]: "true",
        [FORECAST_YEARS_AHEAD_COOKIE_NAME]: "25",
        [GRAPH_MEASURE_COOKIE_NAME]: "max",
        [GRAPH_SEASON_COOKIE_NAME]: "Winter",
        [REFERENCE_YEAR_COOKIE_NAME]: "2010",
      }),
    );
    mockFetchLocations.mockResolvedValue({
      LocationOptions: locationOptions,
      locations: [location],
    });
    mockFetchTrendGraphData.mockResolvedValue({
      increase_per_year: 0.5,
      trendline_wetbulbs: [28, 29],
      year_wetbulbs: [27, 28],
      years: [2023, 2024],
    });
    mockFetchReferenceGraphData
      .mockResolvedValueOnce({
        dates: currentDates,
        wetbulbs: [31, 32],
      })
      .mockResolvedValueOnce({
        dates: currentDates,
        wetbulbs: [25, 26],
      });
    const forecastData = {
      forecastValues: [33, 34],
      forecastYears: [2025, 2026],
      lowerBound10: [30, 31],
      upperBound90: [36, 37],
    };
    mockFetchForecastData.mockResolvedValue(forecastData);

    await expect(loadLocationPageData("7")).resolves.toStrictEqual({
      payload: {
        CurrentDates: currentDates,
        CurrentWetbulbs: [31, 32],
        graphDataError: false,
        IncreasePerYear: 0.5,
        id: 7,
        initialForecastData: forecastData,
        initialForecastEnabled: true,
        initialForecastYearsAhead: 25,
        initialGraphMeasure: "max",
        initialGraphSeason: "Winter",
        initialReferenceYear: "2010",
        initialWetbulbBasis: DEFAULT_WETBULB_BASIS,
        location,
        LocationOptions: locationOptions,
        ReferenceWetbulbs: [25, 26],
        TrendlineWetbulbs: [28, 29],
        YearWetbulbs: [27, 28],
        Years: [2023, 2024],
      },
      status: "success",
    });

    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "max",
      7,
      "Winter",
      "max",
    );
    expect(mockFetchReferenceGraphData).toHaveBeenNthCalledWith(
      1,
      "2025",
      7,
      "Annual",
    );
    expect(mockFetchReferenceGraphData).toHaveBeenNthCalledWith(
      2,
      "2010",
      7,
      "Annual",
    );
    expect(mockFetchForecastData).toHaveBeenCalledWith(7, 25, {
      basis: "max",
      option: "max",
      season: "Winter",
    });
  });

  it("skips fetching forecast data when forecasting is disabled", async () => {
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [],
      locations: [
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 7,
          state: "Massachusetts",
        },
      ],
    });
    mockFetchTrendGraphData.mockResolvedValue({
      increase_per_year: 0.5,
      trendline_wetbulbs: [28, 29],
      year_wetbulbs: [27, 28],
      years: [2023, 2024],
    });
    mockFetchReferenceGraphData
      .mockResolvedValueOnce({ dates: [], wetbulbs: [] })
      .mockResolvedValueOnce({ dates: [], wetbulbs: [] });

    const result = await loadLocationPageData("7");

    expect(result).toStrictEqual({
      payload: expect.objectContaining({
        initialForecastData: undefined,
      }),
      status: "success",
    });
    expect(mockFetchForecastData).not.toHaveBeenCalled();
  });

  it("returns the assembled page data for location id zero when present", async () => {
    const locationOptions = [
      {
        items: [{ key: 0, title: "New York" }],
        title: "New York",
      },
    ];
    const location = {
      city: "New York",
      lat: 40.7128,
      lng: -74.006,
      location_id: 0,
      state: "New York",
    };

    mockFetchLocations.mockResolvedValue({
      LocationOptions: locationOptions,
      locations: [location],
    });
    mockFetchTrendGraphData.mockResolvedValue({
      increase_per_year: 0.5,
      trendline_wetbulbs: [28, 29],
      year_wetbulbs: [27, 28],
      years: [2023, 2024],
    });
    mockFetchReferenceGraphData
      .mockResolvedValueOnce({
        dates: [new Date("2024-01-01")],
        wetbulbs: [31],
      })
      .mockResolvedValueOnce({
        dates: [new Date("2024-01-01")],
        wetbulbs: [25],
      });

    await expect(loadLocationPageData("0")).resolves.toStrictEqual({
      payload: expect.objectContaining({
        CurrentWetbulbs: [31],
        IncreasePerYear: 0.5,
        LocationOptions: locationOptions,
        ReferenceWetbulbs: [25],
        TrendlineWetbulbs: [28, 29],
        YearWetbulbs: [27, 28],
        Years: [2023, 2024],
        id: 0,
        location,
      }),
      status: "success",
    });

    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "avg",
      0,
      "Annual",
      "max",
    );
    expect(mockFetchReferenceGraphData).toHaveBeenNthCalledWith(
      1,
      "2025",
      0,
      "Annual",
    );
  });

  it("falls back to default preferences and reference year when cookies are invalid", async () => {
    mockCookies.mockResolvedValue(
      createCookieStore({
        [FORECAST_ENABLED_COOKIE_NAME]: "not-true",
        [FORECAST_YEARS_AHEAD_COOKIE_NAME]: "200",
      }),
    );
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [],
      locations: [
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 7,
          state: "Massachusetts",
        },
      ],
    });
    mockFetchTrendGraphData.mockResolvedValue({
      trendline_wetbulbs: [],
      year_wetbulbs: [],
      years: [],
    });
    mockFetchReferenceGraphData
      .mockResolvedValueOnce({
        dates: [],
        wetbulbs: [],
      })
      .mockResolvedValueOnce({
        dates: [],
        wetbulbs: [],
      });

    const result = await loadLocationPageData("7");

    expect(result).toStrictEqual({
      payload: expect.objectContaining({
        IncreasePerYear: 0,
        initialForecastEnabled: DEFAULT_FORECAST_ENABLED,
        initialForecastYearsAhead: DEFAULT_FORECAST_YEARS_AHEAD,
        initialGraphMeasure: DEFAULT_GRAPH_MEASURE,
        initialGraphSeason: DEFAULT_GRAPH_SEASON,
        initialReferenceYear: DEFAULT_REFERENCE_YEAR,
      }),
      status: "success",
    });
    expect(mockFetchReferenceGraphData).toHaveBeenNthCalledWith(
      1,
      "2025",
      7,
      "Annual",
    );
  });

  it("falls back when the reference year cookie is the latest configured data year", async () => {
    mockCookies.mockResolvedValue(
      createCookieStore({
        [REFERENCE_YEAR_COOKIE_NAME]: "2025",
      }),
    );
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [],
      locations: [
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 7,
          state: "Massachusetts",
        },
      ],
    });
    mockFetchTrendGraphData.mockResolvedValue({
      trendline_wetbulbs: [],
      year_wetbulbs: [],
      years: [],
    });
    mockFetchReferenceGraphData
      .mockResolvedValueOnce({
        dates: [],
        wetbulbs: [],
      })
      .mockResolvedValueOnce({
        dates: [],
        wetbulbs: [],
      });

    const result = await loadLocationPageData("7");

    expect(result).toStrictEqual({
      payload: expect.objectContaining({
        initialReferenceYear: DEFAULT_REFERENCE_YEAR,
      }),
      status: "success",
    });
    expect(mockFetchReferenceGraphData).toHaveBeenNthCalledWith(
      2,
      DEFAULT_REFERENCE_YEAR,
      7,
      "Annual",
    );
  });

  it("prefers the latest graph preference cookies when duplicates exist", async () => {
    mockCookies.mockResolvedValue(
      createCookieStore(
        {
          [GRAPH_MEASURE_COOKIE_NAME]: "max",
          [GRAPH_SEASON_COOKIE_NAME]: "Annual",
        },
        {
          [GRAPH_MEASURE_COOKIE_NAME]: ["max", "avg"],
          [GRAPH_SEASON_COOKIE_NAME]: ["Annual", "Winter"],
        },
      ),
    );
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [],
      locations: [
        {
          city: "Boston",
          lat: 42.3601,
          lng: -71.0589,
          location_id: 7,
          state: "Massachusetts",
        },
      ],
    });
    mockFetchTrendGraphData.mockResolvedValue({
      trendline_wetbulbs: [28, 29],
      year_wetbulbs: [27, 28],
      years: [2023, 2024],
    });
    mockFetchReferenceGraphData
      .mockResolvedValueOnce({ dates: [], wetbulbs: [] })
      .mockResolvedValueOnce({ dates: [], wetbulbs: [] });

    const result = await loadLocationPageData("7");

    expect(result).toStrictEqual({
      payload: expect.objectContaining({
        initialGraphMeasure: "avg",
        initialGraphSeason: "Winter",
      }),
      status: "success",
    });
  });
});
