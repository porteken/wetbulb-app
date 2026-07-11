import { describe, expect, it } from "vitest";

import { mapTrendRowsToGraphData } from "../graph-data";

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
