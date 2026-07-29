import { describe, expect, it } from "vitest";

import {
  alignReferenceGraphData,
  mapTrendRowsToGraphData,
} from "../graph-data";

describe("alignReferenceGraphData", () => {
  it("aligns a complete reference year to available current-year days", () => {
    const result = alignReferenceGraphData(
      {
        dates: [new Date("2026-01-01"), new Date("2026-01-03")],
        wetbulbs: [1, 3],
      },
      {
        dates: [
          new Date("2025-01-01"),
          new Date("2025-01-02"),
          new Date("2025-01-03"),
        ],
        wetbulbs: [10, 20, 30],
      },
    );

    expect(result).toStrictEqual({
      dates: [new Date("2026-01-01"), new Date("2026-01-03")],
      referenceWetbulbs: [10, 30],
      wetbulbs: [1, 3],
    });
  });
});

describe("mapTrendRowsToGraphData", () => {
  it("preserves valid negative yearly WETBULB values", () => {
    const result = mapTrendRowsToGraphData([
      { wetbulb: -4, year: 2000 },
      { wetbulb: 0, year: 2001 },
      { wetbulb: 4, year: 2002 },
    ]);

    expect(result).toStrictEqual({
      increase_per_year: 4,
      trendline_wetbulbs: [-4, 0, 4],
      year_wetbulbs: [-4, 0, 4],
      years: [2000, 2001, 2002],
    });
  });
});
