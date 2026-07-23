import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";

interface ReferenceGraphData {
  dates: Date[];
  wetbulbs: number[];
}

const {
  mockFetchReferenceGraphData,
  mockValidateLocationId,
  mockValidateYear,
} = vi.hoisted(() => ({
  mockFetchReferenceGraphData:
    vi.fn<
      (
        year: string,
        locationId: number,
        season: string,
      ) => Promise<ReferenceGraphData>
    >(),
  mockValidateLocationId: vi.fn<(locationId: number) => boolean>(),
  mockValidateYear: vi.fn<(year: string) => boolean>(),
}));

vi.mock("@/lib/api/fetch-server", () => ({
  FetchReferenceGraphData: mockFetchReferenceGraphData,
}));

vi.mock("@/lib/utils/validation", () => ({
  validateLocationId: mockValidateLocationId,
  validateYear: mockValidateYear,
}));

describe("get /api/data/reference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateLocationId.mockReturnValue(true);
    mockValidateYear.mockReturnValue(true);
  });

  it("returns 400 for an invalid location id", async () => {
    mockValidateLocationId.mockReturnValue(false);

    const response = await GET(
      new Request(
        "http://localhost/api/data/reference?locationId=bad&year=2025",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid location ID",
    });
    expect(response.status).toBe(400);
    expect(mockFetchReferenceGraphData).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid reference year", async () => {
    mockValidateYear.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/data/reference?locationId=9&year=oops"),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid reference year",
    });
    expect(response.status).toBe(400);
    expect(mockFetchReferenceGraphData).not.toHaveBeenCalled();
  });

  it("returns reference graph data for valid requests", async () => {
    mockFetchReferenceGraphData.mockResolvedValue({
      dates: [new Date("2025-01-01")],
      wetbulbs: [21.4],
    });

    const response = await GET(
      new Request(
        "http://localhost/api/data/reference?locationId=9&season=Winter&year=2025",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      dates: ["2025-01-01T00:00:00.000Z"],
      wetbulbs: [21.4],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(mockFetchReferenceGraphData).toHaveBeenCalledWith(
      "2025",
      9,
      "Winter",
      "max",
    );
  });

  it("normalizes invalid seasons to the default season", async () => {
    mockFetchReferenceGraphData.mockResolvedValue({ dates: [], wetbulbs: [] });

    const response = await GET(
      new Request(
        "http://localhost/api/data/reference?locationId=9&season=Monsoon&year=2025",
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      dates: [],
      wetbulbs: [],
    });
    expect(response.status).toBe(200);
    expect(mockFetchReferenceGraphData).toHaveBeenCalledWith(
      "2025",
      9,
      "Annual",
      "max",
    );
  });

  it("converts thrown errors into data route responses", async () => {
    mockFetchReferenceGraphData.mockRejectedValue(
      new Error("Reference exploded"),
    );

    const response = await GET(
      new Request("http://localhost/api/data/reference?locationId=9&year=2025"),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Reference exploded",
    });
    expect(response.status).toBe(500);
  });
});
