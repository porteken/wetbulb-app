import { EU_LOCATION_ID_MIN } from "@/lib/constants";
import { describe, expect, it } from "vitest";

import {
  fetchCityRankingsRows,
  fetchLocationRows,
  fetchTrendGraphRows,
  fetchReferenceGraphRows,
  fetchHistoricalYearRow,
  fetchForecastRows,
} from "../queries";

describe("db queries", () => {
  it("fetches city rankings correctly", async () => {
    const rows = await fetchCityRankingsRows(2024, "Summer");
    expect(rows).toBeInstanceOf(Array);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("location_id");
    expect(rows[0]).toHaveProperty("city");
    expect(rows[0]).toHaveProperty("avg_wetbulb");
  });

  it("fetches locations with id correctly", async () => {
    const rows = await fetchLocationRows("id");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("id");
    expect(rows[0]).toHaveProperty("city");
    expect(rows[0]).not.toHaveProperty("location_id");
  });

  it("fetches trend graph rows correctly", async () => {
    const rows = await fetchTrendGraphRows(1, "avg");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("location_id", 1);
    expect(rows[0]).toHaveProperty("year");
    expect(rows[0]).toHaveProperty("wetbulb");
  });

  it("fetches reference graph rows correctly", async () => {
    const rows = await fetchReferenceGraphRows(1, "2020");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("location_id", 1);
    expect(rows[0]).toHaveProperty("wetbulb");
  });

  it("fetches historical year row correctly", async () => {
    const row = await fetchHistoricalYearRow(1);
    expect(row).toBeDefined();
    expect(row).toHaveProperty("year");
  });

  it("fetches forecast rows for location", async () => {
    const queryWindow = { lastHistoricalYear: 2025, targetYear: 2100 };
    const rows = await fetchForecastRows(1, queryWindow, {
      option: "avg",
      season: "Annual",
    });
    expect(rows).toBeInstanceOf(Array);
  });

  it("returns different wetbulb values for the avg vs max basis", async () => {
    const maxBasisRows = await fetchTrendGraphRows(1, "max", "Annual", "max");
    const avgBasisRows = await fetchTrendGraphRows(1, "max", "Annual", "avg");
    expect(maxBasisRows.length).toBeGreaterThan(0);
    expect(avgBasisRows.length).toBeGreaterThan(0);
    expect(avgBasisRows[0]).not.toStrictEqual(maxBasisRows[0]);
  });

  it("fetches rankings with the avg basis without error", async () => {
    const rows = await fetchCityRankingsRows(2024, "Summer", "avg");
    expect(rows).toBeInstanceOf(Array);
  });

  it.each(["max", "avg"] as const)(
    "excludes eu locations from the na rankings on the %s basis",
    async (basis) => {
      const rows = await fetchCityRankingsRows(2024, "Summer", basis, "na");
      expect(rows.length).toBeGreaterThan(0);
      expect(
        rows.every((row) => row.location_id < EU_LOCATION_ID_MIN),
      ).toBeTruthy();
    },
  );
});
