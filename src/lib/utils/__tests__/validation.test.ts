import { describe, expect, it } from "vitest";

import {
  validateDates,
  validateLocationId,
  validateWetbulbs,
  validateTrendOption,
  validateYear,
  validateYearWetbulbs,
  validateYears,
} from "../validation";

describe("validation utilities", () => {
  describe("validateDates", () => {
    it("should not throw for valid dates", () => {
      const validDates = [
        new Date("2023-01-01"),
        new Date("2023-12-31"),
        new Date(),
      ];

      expect(() => {
        validateDates(validDates);
      }).not.toThrow();
    });

    it("should throw for invalid dates", () => {
      const invalidDates = [new Date("invalid-date"), new Date("2023-13-01")];

      expect(() => {
        validateDates(invalidDates);
      }).toThrow("Invalid date data detected");
    });

    it("should throw if any date in array is invalid", () => {
      const mixedDates = [
        new Date("2023-01-01"),
        new Date("invalid-date"),
        new Date("2023-12-31"),
      ];

      expect(() => {
        validateDates(mixedDates);
      }).toThrow("Invalid date data detected");
    });

    it("should handle empty array", () => {
      expect(() => {
        validateDates([]);
      }).not.toThrow();
    });
  });

  describe("validateLocationId", () => {
    it("should return true for valid non-negative integers", () => {
      expect(validateLocationId(0)).toBe(true);
      expect(validateLocationId(1)).toBe(true);
      expect(validateLocationId(100)).toBe(true);
      expect(validateLocationId(999)).toBe(true);
    });

    it("should return false for negative numbers", () => {
      expect(validateLocationId(-1)).toBe(false);
      expect(validateLocationId(-100)).toBe(false);
    });

    it("should return false for non-integers", () => {
      expect(validateLocationId(1.5)).toBe(false);
      expect(validateLocationId(3.14)).toBe(false);
    });

    it("should return false for non-numbers", () => {
      expect(validateLocationId("1" as any)).toBe(false);
      expect(validateLocationId(undefined as any)).toBe(false);
      expect(validateLocationId(Number.NaN)).toBe(false);
    });
  });

  describe("validateWetbulbs", () => {
    it("should not throw for valid wetbulb count arrays", () => {
      expect(() => {
        validateWetbulbs([0, 1, 5, 10, 100]);
      }).not.toThrow();
      expect(() => {
        validateWetbulbs([0]);
      }).not.toThrow();
      expect(() => {
        validateWetbulbs([]);
      }).not.toThrow();
    });

    it("should throw for arrays containing NaN", () => {
      expect(() => {
        validateWetbulbs([1, 2, Number.NaN, 4]);
      }).toThrow("Invalid wetbulb count data detected");
    });

    it("should throw for arrays containing only NaN", () => {
      expect(() => {
        validateWetbulbs([Number.NaN]);
      }).toThrow("Invalid wetbulb count data detected");
    });

    it("should handle negative numbers (they are valid wetbulb counts)", () => {
      expect(() => {
        validateWetbulbs([-1, 0, 1]);
      }).not.toThrow();
    });
  });

  describe("validateTrendOption", () => {
    it("should return true for 'avg'", () => {
      expect(validateTrendOption("avg")).toBe(true);
    });

    it("should return true for 'max'", () => {
      expect(validateTrendOption("max")).toBe(true);
    });

    it("should return false for other strings", () => {
      expect(validateTrendOption("min")).toBe(false);
      expect(validateTrendOption("median")).toBe(false);
      expect(validateTrendOption("average")).toBe(false);
      expect(validateTrendOption("maximum")).toBe(false);
      expect(validateTrendOption("")).toBe(false);
    });

    it("should return false for non-strings", () => {
      expect(validateTrendOption(undefined as any)).toBe(false);
      expect(validateTrendOption(123 as any)).toBe(false);
      expect(validateTrendOption(true as any)).toBe(false);
    });

    it("should be case sensitive", () => {
      expect(validateTrendOption("AVG")).toBe(false);
      expect(validateTrendOption("Max")).toBe(false);
      expect(validateTrendOption("MAX")).toBe(false);
    });
  });

  describe("validateYear", () => {
    it("should return true for valid 4-digit year strings", () => {
      expect(validateYear("2023")).toBe(true);
      expect(validateYear("1999")).toBe(true);
      expect(validateYear("2000")).toBe(true);
      expect(validateYear("1900")).toBe(true);
      expect(validateYear("2100")).toBe(true);
    });

    it("should return false for years outside the valid range", () => {
      expect(validateYear("0000")).toBe(false);
      expect(validateYear("1899")).toBe(false);
      expect(validateYear("2101")).toBe(false);
      expect(validateYear("9999")).toBe(false);
    });

    it("should return false for non-4-digit strings", () => {
      expect(validateYear("23")).toBe(false);
      expect(validateYear("123")).toBe(false);
      expect(validateYear("12345")).toBe(false);
    });

    it("should return false for non-numeric strings", () => {
      expect(validateYear("abcd")).toBe(false);
      expect(validateYear("20a3")).toBe(false);
      expect(validateYear("year")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(validateYear("")).toBe(false);
    });

    it("should return false for strings with spaces", () => {
      expect(validateYear(" 2023")).toBe(false);
      expect(validateYear("2023 ")).toBe(false);
      expect(validateYear("20 23")).toBe(false);
    });

    it("should return false for non-strings", () => {
      expect(validateYear(2023 as any)).toBe(true);
      expect(validateYear(undefined as any)).toBe(false);
    });
  });

  describe("validateYearWetbulbs", () => {
    it("should not throw for valid year wetbulb arrays", () => {
      expect(() => {
        validateYearWetbulbs([0, 1, 5, 10, 100]);
      }).not.toThrow();
      expect(() => {
        validateYearWetbulbs([0]);
      }).not.toThrow();
      expect(() => {
        validateYearWetbulbs([]);
      }).not.toThrow();
    });

    it("should throw for arrays containing NaN", () => {
      expect(() => {
        validateYearWetbulbs([1, 2, Number.NaN, 4]);
      }).toThrow("Invalid wetbulb count data detected");
    });

    it("should allow arrays containing negative numbers", () => {
      expect(() => {
        validateYearWetbulbs([1, 2, -1, 4]);
      }).not.toThrow();
    });

    it("should allow arrays containing only negative numbers", () => {
      expect(() => {
        validateYearWetbulbs([-1, -2, -3]);
      }).not.toThrow();
    });

    it("should handle zero (valid wetbulb count)", () => {
      expect(() => {
        validateYearWetbulbs([0, 0, 0]);
      }).not.toThrow();
    });

    it("should handle decimal numbers (they are valid)", () => {
      expect(() => {
        validateYearWetbulbs([1.5, 2.7, 3.14]);
      }).not.toThrow();
    });

    it("should allow mixed negative and decimal WETBULB values", () => {
      expect(() => {
        validateYearWetbulbs([-4.1, 0, 14.3]);
      }).not.toThrow();
    });
  });

  describe("validateYears", () => {
    it("should not throw for valid year arrays", () => {
      expect(() => {
        validateYears([2020, 2021, 2022, 2023]);
      }).not.toThrow();
      expect(() => {
        validateYears([1900, 2100]);
      }).not.toThrow();
      expect(() => {
        validateYears([]);
      }).not.toThrow();
    });

    it("should throw for arrays containing non-integer years", () => {
      expect(() => {
        validateYears([2020.5, 2021, 2022]);
      }).toThrow("Invalid year data detected");
    });

    it("should throw for arrays containing years before 1900", () => {
      expect(() => {
        validateYears([1899, 2020, 2021]);
      }).toThrow("Invalid year data detected");
    });

    it("should throw for arrays containing years after 2100", () => {
      expect(() => {
        validateYears([2020, 2021, 2101]);
      }).toThrow("Invalid year data detected");
    });

    it("should handle boundary values correctly", () => {
      expect(() => {
        validateYears([1900]);
      }).not.toThrow();
      expect(() => {
        validateYears([2100]);
      }).not.toThrow();
      expect(() => {
        validateYears([1899]);
      }).toThrow("Invalid year data detected");
      expect(() => {
        validateYears([2101]);
      }).toThrow("Invalid year data detected");
    });
  });
});
