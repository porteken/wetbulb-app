import { describe, expect, it } from "vitest";

import {
  getForecastWetbulbDescription,
  getWetbulbDescription,
  getWetbulbInfo,
} from "../wetbulb-index";

describe("wetbulb-index", () => {
  describe("getWetbulbInfo", () => {
    it("should return None for wetbulb just below 68", () => {
      const result = getWetbulbInfo(67.9);
      expect(result.level).toBe("None");
      expect(result.color).toBe("text-green-600");
      expect(result.value).toBe("67.9");
    });

    it("should return Low Risk for wetbulb = 68", () => {
      const result = getWetbulbInfo(68);
      expect(result.level).toBe("Low Risk");
      expect(result.color).toBe("text-yellow-600");
      expect(result.value).toBe("68.0");
    });

    it("should keep wetbulb = 76 in Low Risk", () => {
      const result = getWetbulbInfo(76);
      expect(result.level).toBe("Low Risk");
      expect(result.color).toBe("text-yellow-600");
      expect(result.value).toBe("76.0");
    });

    it("should return Moderate Risk for wetbulb just above 76", () => {
      const result = getWetbulbInfo(76.1);
      expect(result.level).toBe("Moderate Risk");
      expect(result.color).toBe("text-amber-600");
      expect(result.value).toBe("76.1");
    });

    it("should keep wetbulb = 81 in Moderate Risk", () => {
      const result = getWetbulbInfo(81);
      expect(result.level).toBe("Moderate Risk");
      expect(result.color).toBe("text-amber-600");
      expect(result.value).toBe("81.0");
    });

    it("should return High Risk for wetbulb just above 81", () => {
      const result = getWetbulbInfo(81.1);
      expect(result.level).toBe("High Risk");
      expect(result.color).toBe("text-orange-600");
      expect(result.value).toBe("81.1");
    });

    it("should keep wetbulb = 84 in High Risk", () => {
      const result = getWetbulbInfo(84);
      expect(result.level).toBe("High Risk");
      expect(result.color).toBe("text-orange-600");
      expect(result.value).toBe("84.0");
    });

    it("should return Extreme Risk for wetbulb just above 84", () => {
      const result = getWetbulbInfo(84.1);
      expect(result.level).toBe("Extreme Risk");
      expect(result.color).toBe("text-red-600");
      expect(result.value).toBe("84.1");
    });

    it("should keep wetbulb = 86 in Extreme Risk", () => {
      const result = getWetbulbInfo(86);
      expect(result.level).toBe("Extreme Risk");
      expect(result.color).toBe("text-red-600");
      expect(result.value).toBe("86.0");
    });

    it("should return Empirical Limit for wetbulb just above 86", () => {
      const result = getWetbulbInfo(86.1);
      expect(result.level).toBe("Empirical Limit");
      expect(result.color).toBe("text-red-800");
      expect(result.value).toBe("86.1");
    });

    it("should keep wetbulb = 94 in Empirical Limit", () => {
      const result = getWetbulbInfo(94);
      expect(result.level).toBe("Empirical Limit");
      expect(result.color).toBe("text-red-800");
      expect(result.value).toBe("94.0");
    });

    it("should return Theoretical Limit for wetbulb just above 94", () => {
      const result = getWetbulbInfo(94.1);
      expect(result.level).toBe("Theoretical Limit");
      expect(result.color).toBe("text-purple-800");
      expect(result.value).toBe("94.1");
    });

    it("should return Theoretical Limit for very high wetbulb values", () => {
      const result = getWetbulbInfo(100);
      expect(result.level).toBe("Theoretical Limit");
      expect(result.color).toBe("text-purple-800");
      expect(result.value).toBe("100.0");
    });

    it("should format value to 1 decimal place", () => {
      const result1 = getWetbulbInfo(80.678);
      expect(result1.value).toBe("80.7");

      const result2 = getWetbulbInfo(80.123);
      expect(result2.value).toBe("80.1");
    });
  });

  describe("getWetbulbDescription", () => {
    it("should return description for average measure type", () => {
      const result = getWetbulbDescription(80, "avg", 2024);
      expect(result.prefix).toBe(
        "The 2024 annual average wetbulb temperature is",
      );
      expect(result.value).toBe("80.0");
      expect(result.colorClass).toBe("text-amber-600");
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should return description for max measure type", () => {
      const result = getWetbulbDescription(83, "max", 2023);
      expect(result.prefix).toBe("The 2023 annual max wetbulb temperature is");
      expect(result.value).toBe("83.0");
      expect(result.colorClass).toBe("text-orange-600");
    });

    it("should use default year 2025 when not provided", () => {
      const result = getWetbulbDescription(70, "avg");
      expect(result.prefix).toBe(
        "The 2025 annual average wetbulb temperature is",
      );
    });

    it("should handle None level", () => {
      const result = getWetbulbDescription(60, "avg", 2024);
      expect(result.colorClass).toBe("text-green-600");
      expect(result.value).toBe("60.0");
    });

    it("should handle Theoretical Limit level", () => {
      const result = getWetbulbDescription(97, "max", 2024);
      expect(result.colorClass).toBe("text-purple-800");
      expect(result.value).toBe("97.0");
    });
  });

  describe("getForecastWetbulbDescription", () => {
    it("should return forecast description with confidence range", () => {
      const result = getForecastWetbulbDescription(80, 2050, 77, 83);
      expect(result.prefix).toBe("By end of 2050, it could be");
      expect(result.value).toBe("80.0");
      expect(result.colorClass).toBe("text-amber-600");
      expect(result.confidenceRange).toBe("(10-90%: 77.0-83.0°F)");
    });

    it("should handle forecast without confidence bounds", () => {
      const result = getForecastWetbulbDescription(80, 2050);
      expect(result.prefix).toBe("By end of 2050, it could be");
      expect(result.value).toBe("80.0");
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should handle NaN lower bound", () => {
      const result = getForecastWetbulbDescription(80, 2050, Number.NaN, 83);
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should handle NaN upper bound", () => {
      const result = getForecastWetbulbDescription(80, 2050, 77, Number.NaN);
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should not show confidence range when bounds are too close (< 0.1)", () => {
      const result = getForecastWetbulbDescription(80, 2050, 80.01, 80.05);
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should show confidence range when bounds are more than 0.1 apart", () => {
      const result = getForecastWetbulbDescription(80, 2050, 79.9, 80.1);
      expect(result.confidenceRange).toBe("(10-90%: 79.9-80.1°F)");
    });

    it("should handle None forecast", () => {
      const result = getForecastWetbulbDescription(60, 2050, 58, 62);
      expect(result.colorClass).toBe("text-green-600");
      expect(result.value).toBe("60.0");
      expect(result.confidenceRange).toBe("(10-90%: 58.0-62.0°F)");
    });

    it("should handle Moderate Risk forecast", () => {
      const result = getForecastWetbulbDescription(80, 2050, 78, 81);
      expect(result.colorClass).toBe("text-amber-600");
      expect(result.value).toBe("80.0");
    });

    it("should handle High Risk forecast", () => {
      const result = getForecastWetbulbDescription(83, 2050, 82, 84);
      expect(result.colorClass).toBe("text-orange-600");
      expect(result.value).toBe("83.0");
    });

    it("should handle Theoretical Limit forecast", () => {
      const result = getForecastWetbulbDescription(97, 2050, 96, 99);
      expect(result.colorClass).toBe("text-purple-800");
      expect(result.value).toBe("97.0");
      expect(result.confidenceRange).toBe("(10-90%: 96.0-99.0°F)");
    });

    it("should format confidence range values to 1 decimal place", () => {
      const result = getForecastWetbulbDescription(80, 2050, 77.456, 82.892);
      expect(result.confidenceRange).toBe("(10-90%: 77.5-82.9°F)");
    });

    it("should handle different forecast years", () => {
      const result1 = getForecastWetbulbDescription(80, 2030, 77, 83);
      expect(result1.prefix).toBe("By end of 2030, it could be");

      const result2 = getForecastWetbulbDescription(80, 2100, 77, 83);
      expect(result2.prefix).toBe("By end of 2100, it could be");
    });
  });
});
