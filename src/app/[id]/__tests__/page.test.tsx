import { LocationPageSkeleton } from "@/features/page/components/location-page-skeleton";
import { render, screen } from "@testing-library/react";
import React, { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDatabaseError, mockLoadLocationPageData, mockNotFound, mockPage } =
  vi.hoisted(() => ({
    mockDatabaseError: mockFn(
      ({ message, title }: { message: string; title: string }) => (
        <div data-testid="database-error">
          {title}:{message}
        </div>
      ),
    ),
    mockLoadLocationPageData: mockFn(),
    mockNotFound: mockFn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    mockPage: mockFn((_properties?: unknown) => (
      <div data-testid="location-page">Location Page</div>
    )),
  }));

vi.mock("@/components/app/database-error", () => ({
  DatabaseError: mockDatabaseError,
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("@/features/page/server/location-page-data", () => ({
  loadLocationPageData: mockLoadLocationPageData,
}));

vi.mock("@/features/page", () => ({
  default: mockPage,
  PageQueryProvider: mockFn(
    ({ children }: { children: React.ReactNode }) => children,
  ),
}));

vi.mock("next/dynamic", () => ({
  default: mockFn(() => mockPage),
}));

import LocationPage, { LocationPageContent } from "../page";

describe("location route page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps the data-loading content in a Suspense boundary with a loading skeleton", async () => {
    const element = await LocationPage({
      params: Promise.resolve({ id: "7" }),
    });

    expect(element.type).toBe(Suspense);
    expect(element.props.fallback.type).toBe(LocationPageSkeleton);
    expect(element.props.children.type).toBe(LocationPageContent);
    expect(element.props.children.props).toStrictEqual({ id: "7" });
  });

  it("renders the page feature for successful data loads", async () => {
    const payload = {
      CurrentDates: [new Date("2024-01-01")],
      CurrentWetbulbs: [30],
      id: 7,
      initialForecastEnabled: false,
      initialForecastYearsAhead: 10,
      initialGraphMeasure: "avg",
      initialGraphSeason: "Annual",
      initialReferenceYear: "2000",
      location: {
        city: "Boston",
        lat: 42.3601,
        lng: -71.0589,
        location_id: 7,
        state: "Massachusetts",
      },
      LocationOptions: [],
      ReferenceWetbulbs: [25],
      TrendlineWetbulbs: [20],
      YearWetbulbs: [19],
      Years: [2024],
    };

    mockLoadLocationPageData.mockResolvedValue({
      payload,
      status: "success",
    });

    render(await LocationPageContent({ id: "7" }));

    expect(mockLoadLocationPageData).toHaveBeenCalledWith("7");
    expect(screen.getByTestId("location-page")).toBeInTheDocument();
    expect(mockPage).toHaveBeenCalledWith(payload, undefined);
  });

  it("renders the database error branch", async () => {
    mockLoadLocationPageData.mockResolvedValue({
      payload: {
        message: "Unable to connect",
        title: "Database Connection Error",
      },
      status: "database-error",
    });

    render(await LocationPageContent({ id: "7" }));

    expect(screen.getByTestId("database-error")).toHaveTextContent(
      "Database Connection Error:Unable to connect",
    );
    expect(mockPage).not.toHaveBeenCalled();
  });

  it("renders the invalid location branch", async () => {
    mockLoadLocationPageData.mockResolvedValue({
      payload: {
        message: "Missing location",
        title: "Location not found",
      },
      status: "invalid-location",
    });

    await expect(LocationPageContent({ id: "404" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(mockPage).not.toHaveBeenCalled();
  });
});
