import * as environment from "@/config/environment";
import { describe, expect, it, vi } from "vitest";

import {
  fetchCityRankingsRows,
  fetchLocationRows,
  fetchTrendGraphRows,
  fetchHistoricalYearRow,
  fetchForecastRows,
  fetchReferenceGraphRows,
} from "../queries";

describe("db queries extra coverage", () => {
  it("uses runtime mock when runtime DB mocks are enabled", async () => {
    vi.spyOn(environment, "shouldUseRuntimeDbMocks").mockReturnValue(true);

    const rankings = await fetchCityRankingsRows(2024);
    expect(rankings).toBeInstanceOf(Array);

    const locations = await fetchLocationRows("id");
    expect(locations).toBeInstanceOf(Array);

    const trend = await fetchTrendGraphRows(1, "avg");
    expect(trend).toBeInstanceOf(Array);

    const historicalYear = await fetchHistoricalYearRow(1);
    expect(historicalYear).toBeDefined();

    const reference = await fetchReferenceGraphRows(1, "2020");
    expect(reference).toBeInstanceOf(Array);

    const forecast = await fetchForecastRows(1, {
      lastHistoricalYear: 2020,
      targetYear: 2030,
    });
    expect(forecast).toBeInstanceOf(Array);

    vi.restoreAllMocks();
  });

  it("returns distinct values for the avg vs max wetbulb basis", async () => {
    vi.spyOn(environment, "shouldUseRuntimeDbMocks").mockReturnValue(true);

    const maxBasisRankings = await fetchCityRankingsRows(2024, "Annual", "max");
    const avgBasisRankings = await fetchCityRankingsRows(2024, "Annual", "avg");
    expect(avgBasisRankings[0]?.avg_wetbulb).not.toStrictEqual(
      maxBasisRankings[0]?.avg_wetbulb,
    );
    expect(avgBasisRankings[0]?.max_wetbulb).not.toStrictEqual(
      maxBasisRankings[0]?.max_wetbulb,
    );

    const maxBasisTrend = await fetchTrendGraphRows(1, "avg", undefined, "max");
    const avgBasisTrend = await fetchTrendGraphRows(1, "avg", undefined, "avg");
    expect(avgBasisTrend[0]?.wetbulb).not.toStrictEqual(
      maxBasisTrend[0]?.wetbulb,
    );

    const queryWindow = { lastHistoricalYear: 2020, targetYear: 2030 };
    const maxBasisForecast = await fetchForecastRows(1, queryWindow, {
      basis: "max",
      option: "avg",
    });
    const avgBasisForecast = await fetchForecastRows(1, queryWindow, {
      basis: "avg",
      option: "avg",
    });
    expect(avgBasisForecast[0]?.wetbulb).not.toStrictEqual(
      maxBasisForecast[0]?.wetbulb,
    );

    vi.restoreAllMocks();
  });
});
