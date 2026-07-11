import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCookies,
  mockFetchCityRankings,
  mockFetchLocations,
  mockRankingsMain,
} = vi.hoisted(() => ({
  mockCookies: mockFn(),
  mockFetchCityRankings: mockFn(),
  mockFetchLocations: mockFn(),
  mockRankingsMain: mockFn((_properties?: unknown) => (
    <div data-testid="rankings-main">Rankings</div>
  )),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/features/rankings", () => ({
  RankingsMain: mockRankingsMain,
}));

vi.mock("@/lib/api/fetch-server", () => ({
  FetchCityRankings: mockFetchCityRankings,
  FetchLocations: mockFetchLocations,
}));

import {
  RANKINGS_WETBULB_LEVEL_COOKIE_NAME,
  RANKINGS_SEASON_COOKIE_NAME,
  RANKINGS_STATE_COOKIE_NAME,
  RANKINGS_YEAR_COOKIE_NAME,
} from "@/lib/constants";

import RankingsPage, { metadata } from "../page";

const createCookieStore = (values: Partial<Record<string, string>>) => ({
  get: (name: string) => {
    const value = values[name];
    return value ? { value } : undefined;
  },
});

describe("rankings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCityRankings.mockResolvedValue([
      {
        avg_wetbulb: 35.5,
        city: "Phoenix",
        location_id: 1,
        rank: 1,
        state: "Arizona",
      },
    ]);
    mockFetchLocations.mockResolvedValue({
      LocationOptions: [
        {
          items: [{ key: 1, title: "Phoenix" }],
          title: "Arizona",
        },
      ],
    });
  });

  it("uses the search param year before the cookie year", async () => {
    mockCookies.mockResolvedValue(
      createCookieStore({
        [RANKINGS_WETBULB_LEVEL_COOKIE_NAME]: "severe",
        [RANKINGS_SEASON_COOKIE_NAME]: "Winter",
        [RANKINGS_STATE_COOKIE_NAME]: "Arizona",
        [RANKINGS_YEAR_COOKIE_NAME]: "2027",
      }),
    );

    render(
      await RankingsPage({
        searchParams: Promise.resolve({ measure: "avg", year: "2031" }),
      }),
    );

    expect(metadata).toStrictEqual({
      description: "City rankings by wet-bulb temperature values",
      title: "City Rankings - Wetbulb Index",
    });
    expect(mockFetchCityRankings).toHaveBeenCalledWith(2031, "Winter");
    expect(screen.getByTestId("rankings-main")).toBeInTheDocument();
    expect(mockRankingsMain).toHaveBeenCalledWith(
      {
        initialWetbulbLevel: "severe",
        initialSeason: "Winter",
        initialState: "Arizona",
        initialYear: 2031,
        LocationOptions: [
          {
            items: [{ key: 1, title: "Phoenix" }],
            title: "Arizona",
          },
        ],
        rankings: [
          {
            avg_wetbulb: 35.5,
            city: "Phoenix",
            location_id: 1,
            rank: 1,
            state: "Arizona",
          },
        ],
        shouldPersistInitialSeason: false,
      },
      undefined,
    );
  });

  it("falls back to the cookie year and default annual season when the season cookie is missing", async () => {
    mockCookies.mockResolvedValue(
      createCookieStore({
        [RANKINGS_YEAR_COOKIE_NAME]: "2028",
      }),
    );

    render(
      await RankingsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mockFetchCityRankings).toHaveBeenCalledWith(2028, "Annual");
    expect(mockRankingsMain).toHaveBeenCalledWith(
      expect.objectContaining({
        initialWetbulbLevel: "",
        initialSeason: "Annual",
        initialState: "",
        initialYear: 2028,
        shouldPersistInitialSeason: false,
      }),
      undefined,
    );
  });

  it("defaults to 2025 when neither search params nor cookies provide a year", async () => {
    mockCookies.mockResolvedValue(createCookieStore({}));

    render(
      await RankingsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mockFetchCityRankings).toHaveBeenCalledWith(2025, "Annual");
    expect(mockRankingsMain).toHaveBeenCalledWith(
      expect.objectContaining({
        initialSeason: "Annual",
        initialYear: 2025,
        shouldPersistInitialSeason: false,
      }),
      undefined,
    );
  });

  it("normalizes an invalid season cookie back to annual", async () => {
    mockCookies.mockResolvedValue(
      createCookieStore({
        [RANKINGS_SEASON_COOKIE_NAME]: "Monsoon",
      }),
    );

    render(
      await RankingsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mockFetchCityRankings).toHaveBeenCalledWith(2025, "Annual");
    expect(mockRankingsMain).toHaveBeenCalledWith(
      expect.objectContaining({
        initialSeason: "Annual",
        shouldPersistInitialSeason: true,
      }),
      undefined,
    );
  });
});
