import { beforeEach, describe, expect, it, vi } from "vitest";

interface TrendGraphData {
  increase_per_year: number;
  trendline_wetbulbs: number[];
  year_wetbulbs: number[];
  years: number[];
}

const {
  mockFetchTrendGraphData,
  mockValidateLocationId,
  mockValidateTrendOption,
} = vi.hoisted(() => ({
  mockFetchTrendGraphData:
    vi.fn<
      (
        option: string,
        locationId: number,
        season: string,
      ) => Promise<TrendGraphData>
    >(),
  mockValidateLocationId: vi.fn<(locationId: number) => boolean>(),
  mockValidateTrendOption: vi.fn<(option: string) => boolean>(),
}));

vi.mock("@/lib/api/fetch-server", () => ({
  FetchTrendGraphData: mockFetchTrendGraphData,
}));

vi.mock("@/lib/utils/validation", () => ({
  validateLocationId: mockValidateLocationId,
  validateTrendOption: mockValidateTrendOption,
}));

import { GET } from "../route";

describe("get /api/data/trend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateLocationId.mockReturnValue(true);
    mockValidateTrendOption.mockReturnValue(true);
  });

  it("returns 400 for an invalid location id", async () => {
    mockValidateLocationId.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/data/trend?locationId=nope&option=avg"),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid location ID",
    });
    expect(response.status).toBe(400);
    expect(mockFetchTrendGraphData).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid trend option", async () => {
    mockValidateTrendOption.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/data/trend?locationId=4&option=median"),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid trend option",
    });
    expect(response.status).toBe(400);
    expect(mockFetchTrendGraphData).not.toHaveBeenCalled();
  });

  it("returns trend graph data for valid requests", async () => {
    mockFetchTrendGraphData.mockResolvedValue({
      increase_per_year: 0.12,
      trendline_wetbulbs: [24.1],
      year_wetbulbs: [23.8],
      years: [2025],
    });

    const response = await GET(
      new Request(
        "http://localhost/api/data/trend?locationId=4&option=max&season=Summer",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      increase_per_year: 0.12,
      trendline_wetbulbs: [24.1],
      year_wetbulbs: [23.8],
      years: [2025],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "max",
      4,
      "Summer",
      "max",
    );
  });

  it("normalizes invalid seasons to the default season", async () => {
    mockFetchTrendGraphData.mockResolvedValue({
      increase_per_year: 0,
      trendline_wetbulbs: [],
      year_wetbulbs: [],
      years: [],
    });

    const response = await GET(
      new Request(
        "http://localhost/api/data/trend?locationId=4&option=avg&season=Monsoon",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      increase_per_year: 0,
      trendline_wetbulbs: [],
      year_wetbulbs: [],
      years: [],
    });
    expect(response.status).toBe(200);
    expect(mockFetchTrendGraphData).toHaveBeenCalledWith(
      "avg",
      4,
      "Annual",
      "max",
    );
  });

  it("converts thrown errors into data route responses", async () => {
    mockFetchTrendGraphData.mockRejectedValue({
      message: "Trend unavailable",
      statusCode: 502,
    });

    const response = await GET(
      new Request("http://localhost/api/data/trend?locationId=4&option=avg"),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Trend unavailable",
    });
    expect(response.status).toBe(502);
  });
});
