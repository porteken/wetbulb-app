import { FetchError } from "@/lib/utils/errors";
import { clearAllMocks, setupApiClientTest } from "@/testing/test-utilities";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FetchReferenceGraphData } from "../reference-graph-data";

import type { createMockValidation } from "@/testing/mocks";

const createJsonResponse = (body: unknown, status = 200) =>
  Response.json(body, { status });

describe("reference-graph-data", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let mockValidation: ReturnType<typeof createMockValidation>;

  beforeEach(async () => {
    clearAllMocks();

    const setup = await setupApiClientTest();
    mockValidation = setup.mockValidation;

    fetchMock = mockFn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("fetches and parses reference data successfully", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        dates: ["2023-01-01T00:00:00.000Z", "2023-01-02T00:00:00.000Z"],
        wetbulbs: [25.5, 26.2],
      }),
    );

    const result = await FetchReferenceGraphData("2023", 1);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data/reference?basis=max&locationId=1&season=Annual&year=2023",
      expect.any(Object),
    );
    expect(result).toStrictEqual({
      dates: [
        new Date("2023-01-01T00:00:00.000Z"),
        new Date("2023-01-02T00:00:00.000Z"),
      ],
      wetbulbs: [25.5, 26.2],
    });
  });

  it("throws FetchError for an invalid year", async () => {
    mockValidation.validateYear.mockReturnValue(false);

    await expect(FetchReferenceGraphData("abc", 1)).rejects.toThrow(
      new FetchError("Invalid year format. Must be a 4-digit year."),
    );
  });

  it("throws FetchError for an invalid location ID", async () => {
    mockValidation.validateLocationId.mockReturnValue(false);

    await expect(FetchReferenceGraphData("2023", -1)).rejects.toThrow(
      new FetchError("Invalid location ID: -1"),
    );
  });

  it("returns empty arrays when the API returns an empty dataset", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        dates: [],
        wetbulbs: [],
      }),
    );

    await expect(FetchReferenceGraphData("2023", 1)).resolves.toStrictEqual({
      dates: [],
      wetbulbs: [],
    });
  });

  it("surfaces route errors", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({ error: "Database connection failed" }, 500),
    );

    await expect(FetchReferenceGraphData("2023", 1)).rejects.toThrow(
      "Failed to fetch reference data for location 1, year 2023: Database connection failed",
    );
  });

  it("wraps unexpected fetch failures", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    await expect(FetchReferenceGraphData("2023", 1)).rejects.toThrow(
      "Failed to fetch reference data for location 1, year 2023: Network error",
    );
  });

  it("rejects malformed API responses", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        dates: ["not-a-date"],
        wetbulbs: [25.5],
      }),
    );

    await expect(FetchReferenceGraphData("2023", 1)).rejects.toThrow(
      "response validation failed",
    );
  });
});
