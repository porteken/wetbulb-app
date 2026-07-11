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
    it("should return year options from 2000 to 2025 by default", () => {
      const yearOptions = YearOptions();

      expect(yearOptions).toHaveLength(26);
      expect(yearOptions[0]).toStrictEqual({ key: "2000", label: "2000" });
      expect(yearOptions[25]).toStrictEqual({ key: "2025", label: "2025" });
    });

    it("should exclude the latest year when requested", () => {
      const yearOptions = YearOptions({ includeLatestYear: false });

      expect(yearOptions).toHaveLength(25);
      expect(yearOptions[0]).toStrictEqual({ key: "2000", label: "2000" });
      expect(yearOptions[24]).toStrictEqual({ key: "2024", label: "2024" });
      expect(yearOptions).not.toContainEqual({ key: "2025", label: "2025" });
    });
  });

  describe("isSelectableReferenceYear", () => {
    it("should only allow years before the latest configured year", () => {
      expect(isSelectableReferenceYear("2000")).toBe(true);
      expect(isSelectableReferenceYear("2024")).toBe(true);
      expect(isSelectableReferenceYear("2025")).toBe(false);
      expect(isSelectableReferenceYear("1999")).toBe(false);
      expect(isSelectableReferenceYear("not-a-year")).toBe(false);
    });
  });
});
