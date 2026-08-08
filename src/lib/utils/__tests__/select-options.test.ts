import { describe, expect, it } from "vitest";

import {
  GraphOptions,
  isSelectableReferenceYear,
  YearOptions,
} from "../select-options";

describe("select Options", () => {
  describe("graphOptions", () => {
    it("should return correct graph options", () => {
      expect(GraphOptions).toStrictEqual([
        { key: "avg", label: "Average" },
        { key: "max", label: "Max" },
      ]);
    });
  });

  describe("yearOptions", () => {
    it("should return year options from 1990 to 2026 by default", () => {
      const yearOptions = YearOptions();

      expect(yearOptions).toHaveLength(37);
      expect(yearOptions[0]).toStrictEqual({ key: "1990", label: "1990" });
      expect(yearOptions[36]).toStrictEqual({ key: "2026", label: "2026" });
    });

    it("should exclude the latest year when requested", () => {
      const yearOptions = YearOptions({ includeLatestYear: false });

      expect(yearOptions).toHaveLength(36);
      expect(yearOptions[0]).toStrictEqual({ key: "1990", label: "1990" });
      expect(yearOptions[35]).toStrictEqual({ key: "2025", label: "2025" });
      expect(yearOptions).not.toContainEqual({ key: "2026", label: "2026" });
    });

    it("should honor an earlier dataset start year", () => {
      const yearOptions = YearOptions({ endYear: 1982, startYear: 1980 });

      expect(yearOptions).toStrictEqual([
        { key: "1980", label: "1980" },
        { key: "1981", label: "1981" },
        { key: "1982", label: "1982" },
      ]);
    });
  });

  describe("isSelectableReferenceYear", () => {
    it("should only allow years before the latest configured year", () => {
      expect(isSelectableReferenceYear("2000")).toBe(true);
      expect(isSelectableReferenceYear("2024")).toBe(true);
      expect(isSelectableReferenceYear("2025")).toBe(true);
      expect(isSelectableReferenceYear("2026")).toBe(false);
      expect(isSelectableReferenceYear("2027")).toBe(false);
      expect(isSelectableReferenceYear("1989")).toBe(false);
      expect(isSelectableReferenceYear("not-a-year")).toBe(false);
    });
  });
});
