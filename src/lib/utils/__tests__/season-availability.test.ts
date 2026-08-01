import { describe, expect, it } from "vitest";

import {
  getCurrentGraphSeason,
  isCurrentYearRankingAvailable,
  isCurrentYearTrendAvailable,
} from "../season-availability";

const date = (month: number, day = 1) =>
  new Date(Date.UTC(2026, month - 1, day));

describe("current-year season availability", () => {
  it.each([
    [1, "Winter"],
    [3, "Spring"],
    [6, "Summer"],
    [9, "Fall"],
    [12, "Winter"],
  ] as const)("identifies %s as %s", (month, expectedSeason) => {
    expect(getCurrentGraphSeason(date(month))).toBe(expectedSeason);
  });

  it("never exposes incomplete annual data", () => {
    expect(isCurrentYearRankingAvailable("Annual", date(12, 31))).toBe(false);
    expect(isCurrentYearTrendAvailable("Annual", date(12, 31))).toBe(false);
  });

  it("exposes rankings once a season starts", () => {
    expect(isCurrentYearRankingAvailable("Summer", date(5, 31))).toBe(false);
    expect(isCurrentYearRankingAvailable("Summer", date(6))).toBe(true);
  });

  it("exposes calendar-year winter from January onward", () => {
    expect(isCurrentYearRankingAvailable("Winter", date(1))).toBe(true);
    expect(isCurrentYearRankingAvailable("Winter", date(11, 30))).toBe(true);
    expect(isCurrentYearRankingAvailable("Winter", date(12))).toBe(true);
    expect(isCurrentYearTrendAvailable("Winter", date(1))).toBe(true);
    expect(isCurrentYearTrendAvailable("Winter", date(11, 30))).toBe(true);
    expect(isCurrentYearTrendAvailable("Winter", date(12))).toBe(true);
  });

  it("exposes trend data once a season starts", () => {
    expect(isCurrentYearTrendAvailable("Summer", date(5, 31))).toBe(false);
    expect(isCurrentYearTrendAvailable("Summer", date(6))).toBe(true);
  });
});
