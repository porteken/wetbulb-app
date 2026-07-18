import { beforeEach, describe, expect, it, vi } from "vitest";

interface ForecastData {
  forecastValues: number[];
  forecastYears: number[];
  lowerBound10: number[];
  upperBound90: number[];
  scenario: "ssp126" | "ssp245" | "ssp370";
}

const { mockFetchForecastData, mockValidateLocationId } = vi.hoisted(() => ({
  mockFetchForecastData:
    vi.fn<
      (
        locationId: number,
        yearsAhead: number,
        season: string,
        option: string,
      ) => Promise<ForecastData | undefined>
    >(),
  mockValidateLocationId: vi.fn<(locationId: number) => boolean>(),
}));

vi.mock("@/lib/api/fetch-server", () => ({
  FetchForecastData: mockFetchForecastData,
}));

vi.mock("@/lib/utils/validation", () => ({
  validateLocationId: mockValidateLocationId,
}));

import { GET } from "../route";

describe("get /api/data/forecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateLocationId.mockReturnValue(true);
  });

  it("returns 400 for an invalid location id", async () => {
    mockValidateLocationId.mockReturnValue(false);

    const response = await GET(
      new Request(
        "http://localhost/api/data/forecast?locationId=bad&yearsAhead=10",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid location ID",
    });
    expect(response.status).toBe(400);
    expect(mockFetchForecastData).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid yearsAhead value", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/data/forecast?locationId=7&yearsAhead=-1",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid yearsAhead value",
    });
    expect(response.status).toBe(400);
    expect(mockFetchForecastData).not.toHaveBeenCalled();
  });

  it("returns forecast data for valid requests", async () => {
    mockFetchForecastData.mockResolvedValue({
      forecastValues: [30.2],
      forecastYears: [2026],
      lowerBound10: [28.5],
      upperBound90: [31.9],
      scenario: "ssp126",
    });

    const response = await GET(
      new Request(
        "http://localhost/api/data/forecast?locationId=7&season=Summer&yearsAhead=12&scenario=ssp126",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      forecastValues: [30.2],
      forecastYears: [2026],
      lowerBound10: [28.5],
      upperBound90: [31.9],
      scenario: "ssp126",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(mockFetchForecastData).toHaveBeenCalledWith(7, 12, {
      basis: "max",
      option: "avg",
      scenario: "ssp126",
      season: "Summer",
    });
  });

  it("normalizes invalid seasons to the default season", async () => {
    mockFetchForecastData.mockResolvedValue(null as any);

    const response = await GET(
      new Request(
        "http://localhost/api/data/forecast?locationId=7&season=Monsoon&yearsAhead=5",
      ),
    );

    await expect(response.json()).resolves.toBeNull();
    expect(response.status).toBe(200);
    expect(mockFetchForecastData).toHaveBeenCalledWith(7, 5, {
      basis: "max",
      option: "avg",
      scenario: "ssp245",
      season: "Annual",
    });
  });

  it("returns 400 for an invalid forecast scenario", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/data/forecast?locationId=7&yearsAhead=5&scenario=rcp85",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid forecast scenario",
    });
    expect(response.status).toBe(400);
    expect(mockFetchForecastData).not.toHaveBeenCalled();
  });

  it("converts thrown errors into data route responses", async () => {
    mockFetchForecastData.mockRejectedValue({
      message: "Forecast unavailable",
      statusCode: 503,
    });

    const response = await GET(
      new Request(
        "http://localhost/api/data/forecast?locationId=7&yearsAhead=10",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Forecast unavailable",
    });
    expect(response.status).toBe(503);
  });
});
