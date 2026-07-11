import { FetchTrendGraphData } from "@/lib/api/fetch-client";
import { FetchReferenceGraphData } from "@/lib/api/reference-graph-data";
import { server } from "@/testing/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

describe("data API MSW integration", () => {
  it("fetches trend graph data through MSW-backed internal API responses", async () => {
    const result = await FetchTrendGraphData("avg", 1);

    expect(result.years.length).toBeGreaterThan(0);
    expect(result.year_wetbulbs).toHaveLength(result.years.length);
    expect(result.years[0]).toBe(2000);
  });

  it("fetches reference graph data through MSW-backed internal API responses", async () => {
    const result = await FetchReferenceGraphData("2025", 1);

    expect(result.dates.length).toBeGreaterThan(0);
    expect(result.wetbulbs).toHaveLength(result.dates.length);
  });

  it("fails with a validation error when MSW returns malformed trend data", async () => {
    server.use(
      http.get("*/api/data/trend", () =>
        HttpResponse.json(
          {
            increase_per_year: 0.2,
            trendline_wetbulbs: [20],
            year_wetbulbs: ["not-a-number"],
            years: [2025],
          },
          { status: 200 },
        ),
      ),
    );

    await expect(FetchTrendGraphData("avg", 1)).rejects.toThrow(
      "response validation failed",
    );
  });
});
