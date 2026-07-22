import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Page from "../page";

const {
  mockGetForecastPreferencesFromCookies,
  mockGetGraphMeasureFromCookies,
  mockGetGraphSeasonFromCookies,
  mockGetLocationData,
  mockHome,
  mockLocationErrorHandler,
  mockPageLoader,
} = vi.hoisted(() => ({
  mockGetForecastPreferencesFromCookies: mockFn(),
  mockGetGraphMeasureFromCookies: mockFn(),
  mockGetGraphSeasonFromCookies: mockFn(),
  mockGetLocationData: mockFn(),
  mockHome: mockFn((_properties?: any) => (
    <div data-testid="home-component">Home Component</div>
  )),
  mockLocationErrorHandler: mockFn((_properties?: any) => (
    <div data-testid="error-handler">Error Handler</div>
  )),
  mockPageLoader: mockFn(() => <div data-testid="page-loader">Loading...</div>),
}));

vi.mock("@/features/home", () => ({
  default: mockHome,
}));

vi.mock("@/lib/utils/app/page-helpers", () => ({
  getForecastPreferencesFromCookies: mockGetForecastPreferencesFromCookies,
  getGraphMeasureFromCookies: mockGetGraphMeasureFromCookies,
  getGraphSeasonFromCookies: mockGetGraphSeasonFromCookies,
  getLocationData: mockGetLocationData,
}));

vi.mock("@/components/app/error-handlers", () => ({
  LocationErrorHandler: mockLocationErrorHandler,
}));

vi.mock("@/components/app/page-loader", () => ({
  PageLoader: mockPageLoader,
}));

vi.mock("next/dynamic", () => ({
  default: mockFn(
    (_importFunction: unknown, options?: { loading?: unknown }) => {
      const DynamicComponent = (properties: any) => {
        if (options?.loading) {
          return mockHome(properties);
        }
        return mockHome(properties);
      };
      DynamicComponent.displayName = "DynamicHome";
      return DynamicComponent;
    },
  ),
}));

describe("page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Home component with correct props when data is available", async () => {
    const mockLocationData = {
      LocationOptions: [
        { label: "Location 1", value: "1" },
        { label: "Location 2", value: "2" },
      ],
      locations: [
        { id: 1, lat: 40.7128, lng: -74.006, name: "Location 1" },
        { id: 2, lat: 34.0522, lng: -118.2437, name: "Location 2" },
      ],
    };

    mockGetGraphMeasureFromCookies.mockResolvedValue("temperature");
    mockGetGraphSeasonFromCookies.mockResolvedValue("Annual");
    mockGetForecastPreferencesFromCookies.mockResolvedValue({
      enabled: false,
      yearsAhead: 10,
    });
    mockGetLocationData.mockResolvedValue(mockLocationData);

    render(await Page());

    expect(screen.getByTestId("home-component")).toBeInTheDocument();
    expect(mockHome.mock.calls.at(-1)?.[0]).toStrictEqual({
      initialForecastEnabled: false,
      initialForecastYearsAhead: 10,
      initialGraphMeasure: "temperature",
      initialGraphSeason: "Annual",
      LocationOptions: mockLocationData.LocationOptions,
      locations: mockLocationData.locations,
    });
  });

  it("renders error handler when getLocationData throws error", async () => {
    const error = new Error("Failed to fetch locations");

    mockGetGraphMeasureFromCookies.mockResolvedValue("humidity");
    mockGetGraphSeasonFromCookies.mockResolvedValue("Annual");
    mockGetForecastPreferencesFromCookies.mockResolvedValue({
      enabled: false,
      yearsAhead: 10,
    });
    mockGetLocationData.mockRejectedValue(error);

    render(await Page());

    expect(screen.getByTestId("error-handler")).toBeInTheDocument();
    expect(mockLocationErrorHandler.mock.calls.at(-1)?.[0]).toStrictEqual({
      error,
    });
    expect(mockHome).not.toHaveBeenCalled();
  });

  it("renders error handler when getGraphMeasureFromCookies throws error", async () => {
    const error = new Error("Cookie access failed");

    mockGetGraphMeasureFromCookies.mockRejectedValue(error);
    mockGetGraphSeasonFromCookies.mockResolvedValue("Annual");
    mockGetForecastPreferencesFromCookies.mockResolvedValue({
      enabled: false,
      yearsAhead: 10,
    });
    mockGetLocationData.mockResolvedValue({
      LocationOptions: [],
      locations: [],
    });

    render(await Page());

    expect(screen.getByTestId("error-handler")).toBeInTheDocument();
    expect(mockLocationErrorHandler.mock.calls.at(-1)?.[0]).toStrictEqual({
      error,
    });
    expect(mockHome).not.toHaveBeenCalled();
  });

  it("calls page helper functions in correct order", async () => {
    const mockLocationData = {
      LocationOptions: [{ label: "Location 1", value: "1" }],
      locations: [{ id: 1, lat: 0, lng: 0, name: "Location 1" }],
    };

    mockGetGraphMeasureFromCookies.mockResolvedValue("pressure");
    mockGetGraphSeasonFromCookies.mockResolvedValue("Annual");
    mockGetForecastPreferencesFromCookies.mockResolvedValue({
      enabled: false,
      yearsAhead: 10,
    });
    mockGetLocationData.mockResolvedValue(mockLocationData);

    render(await Page());

    expect(mockGetGraphMeasureFromCookies).toHaveBeenCalledBefore(
      mockGetLocationData,
    );
    expect(mockGetGraphMeasureFromCookies).toHaveBeenCalledTimes(1);
    expect(mockGetGraphSeasonFromCookies).toHaveBeenCalledTimes(1);
    expect(mockGetForecastPreferencesFromCookies).toHaveBeenCalledTimes(1);
    expect(mockGetLocationData).toHaveBeenCalledTimes(1);
  });

  it("handles empty location data appropriately", async () => {
    const emptyLocationData = {
      LocationOptions: [],
      locations: [],
    };

    mockGetGraphMeasureFromCookies.mockResolvedValue("temperature");
    mockGetGraphSeasonFromCookies.mockResolvedValue("Annual");
    mockGetForecastPreferencesFromCookies.mockResolvedValue({
      enabled: false,
      yearsAhead: 10,
    });
    mockGetLocationData.mockResolvedValue(emptyLocationData);

    render(await Page());

    expect(screen.getByTestId("home-component")).toBeInTheDocument();
    expect(mockHome.mock.calls.at(-1)?.[0]).toStrictEqual({
      initialForecastEnabled: false,
      initialForecastYearsAhead: 10,
      initialGraphMeasure: "temperature",
      initialGraphSeason: "Annual",
      LocationOptions: [],
      locations: [],
    });
  });
});
