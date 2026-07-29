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
    it("should return year options from 2000 to 2026 by default", () => {
      const yearOptions = YearOptions();

      expect(yearOptions).toHaveLength(27);
      expect(yearOptions[0]).toStrictEqual({ key: "2000", label: "2000" });
      expect(yearOptions[26]).toStrictEqual({ key: "2026", label: "2026" });
    });

    it("should exclude the latest year when requested", () => {
      const yearOptions = YearOptions({ includeLatestYear: false });

      expect(yearOptions).toHaveLength(26);
      expect(yearOptions[0]).toStrictEqual({ key: "2000", label: "2000" });
      expect(yearOptions[25]).toStrictEqual({ key: "2025", label: "2025" });
      expect(yearOptions).not.toContainEqual({ key: "2026", label: "2026" });
    });
  });

  describe("isSelectableReferenceYear", () => {
    it("should only allow years before the latest configured year", () => {
      expect(isSelectableReferenceYear("2000")).toBe(true);
      expect(isSelectableReferenceYear("2024")).toBe(true);
      expect(isSelectableReferenceYear("2025")).toBe(true);
      expect(isSelectableReferenceYear("2026")).toBe(false);
      expect(isSelectableReferenceYear("2027")).toBe(false);
      expect(isSelectableReferenceYear("1999")).toBe(false);
      expect(isSelectableReferenceYear("not-a-year")).toBe(false);
    });
  });
});
