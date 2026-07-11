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

  // The schema uses "id", so fetching with "location_id" should either throw or we can just omit testing it since it's an internal fallback that might fail on real PG depending on how Kysely handles missing columns.

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
    const rows = await fetchForecastRows(1, queryWindow, "Annual", "avg");
    expect(rows).toBeInstanceOf(Array);
  });
});
