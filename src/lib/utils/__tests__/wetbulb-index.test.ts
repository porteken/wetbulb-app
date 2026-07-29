import { describe, expect, it } from "vitest";

import {
  getForecastWetbulbDescription,
  getWetbulbDescription,
  getWetbulbInfo,
  getWetbulbRangeLabel,
  WETBULB_INDEX_LEGEND_ITEMS,
} from "../wetbulb-index";

describe("wetbulb-index", () => {
  describe("unit conversion", () => {
    it("should format values in Fahrenheit by default", () => {
      const result = getWetbulbInfo(26.6667);
      expect(result.value).toBe("80.0°F");
    });

    it("should leave the display value in Celsius when unit is C", () => {
      const result = getWetbulbInfo(26.6667, "C");
      expect(result.value).toBe("26.7°C");
    });

    it("should keep classification based on the Celsius value regardless of unit", () => {
      const fahrenheitDisplay = getWetbulbInfo(29.5);
      const celsiusDisplay = getWetbulbInfo(29.5, "C");
      expect(fahrenheitDisplay.level).toBe("Extreme Risk");
      expect(celsiusDisplay.level).toBe("Extreme Risk");
    });

    it("should convert getWetbulbDescription values to Fahrenheit", () => {
      const result = getWetbulbDescription(26.6667, "avg", {
        season: "Annual",
        unit: "F",
        year: 2024,
      });
      expect(result.value).toBe("80.0°F");
    });

    it("should convert getForecastWetbulbDescription values and confidence range to Fahrenheit", () => {
      const result = getForecastWetbulbDescription(26.6667, 2050, {
        lowerBound10: 25,
        unit: "F",
        upperBound90: 28.3,
      });
      expect(result.value).toBe("80.0°F");
      expect(result.confidenceRange).toBe("(10-90%: 77.0-82.9°F)");
    });

    it("should expose clean, independently-sourced Fahrenheit range labels for the legend", () => {
      const lowRisk = WETBULB_INDEX_LEGEND_ITEMS.find(
        (item) => item.level === "Low Risk",
      );
      expect(lowRisk).toBeDefined();
      expect(getWetbulbRangeLabel(lowRisk!, "C")).toBe("20–24°C");
      expect(getWetbulbRangeLabel(lowRisk!, "F")).toBe("68–76°F");
    });
  });

  describe("getWetbulbInfo", () => {
    it("should return None for wetbulb just below 20", () => {
      const result = getWetbulbInfo(19.9, "C");
      expect(result.level).toBe("None");
      expect(result.color).toBe("text-green-600");
      expect(result.value).toBe("19.9°C");
    });

    it("should return Low Risk for wetbulb = 20", () => {
      const result = getWetbulbInfo(20, "C");
      expect(result.level).toBe("Low Risk");
      expect(result.color).toBe("text-yellow-600");
      expect(result.value).toBe("20.0°C");
    });

    it("should keep wetbulb = 24 in Low Risk", () => {
      const result = getWetbulbInfo(24, "C");
      expect(result.level).toBe("Low Risk");
      expect(result.color).toBe("text-yellow-600");
      expect(result.value).toBe("24.0°C");
    });

    it("should return Moderate Risk for wetbulb just above 24", () => {
      const result = getWetbulbInfo(24.1, "C");
      expect(result.level).toBe("Moderate Risk");
      expect(result.color).toBe("text-amber-600");
      expect(result.value).toBe("24.1°C");
    });

    it("should keep wetbulb = 26 in Moderate Risk", () => {
      const result = getWetbulbInfo(26, "C");
      expect(result.level).toBe("Moderate Risk");
      expect(result.color).toBe("text-amber-600");
      expect(result.value).toBe("26.0°C");
    });

    it("should return High Risk for wetbulb just above 26", () => {
      const result = getWetbulbInfo(26.1, "C");
      expect(result.level).toBe("High Risk");
      expect(result.color).toBe("text-orange-600");
      expect(result.value).toBe("26.1°C");
    });

    it("should keep wetbulb = 28 in High Risk", () => {
      const result = getWetbulbInfo(28, "C");
      expect(result.level).toBe("High Risk");
      expect(result.color).toBe("text-orange-600");
      expect(result.value).toBe("28.0°C");
    });

    it("should return Extreme Risk for wetbulb just above 28", () => {
      const result = getWetbulbInfo(28.1, "C");
      expect(result.level).toBe("Extreme Risk");
      expect(result.color).toBe("text-red-600");
      expect(result.value).toBe("28.1°C");
    });

    it("should keep wetbulb = 30 in Extreme Risk", () => {
      const result = getWetbulbInfo(30, "C");
      expect(result.level).toBe("Extreme Risk");
      expect(result.color).toBe("text-red-600");
      expect(result.value).toBe("30.0°C");
    });

    it("should return Empirical Limit for wetbulb just above 30", () => {
      const result = getWetbulbInfo(30.1, "C");
      expect(result.level).toBe("Empirical Limit");
      expect(result.color).toBe("text-red-800");
      expect(result.value).toBe("30.1°C");
    });

    it("should keep wetbulb = 34 in Empirical Limit", () => {
      const result = getWetbulbInfo(34, "C");
      expect(result.level).toBe("Empirical Limit");
      expect(result.color).toBe("text-red-800");
      expect(result.value).toBe("34.0°C");
    });

    it("should return Theoretical Limit for wetbulb just above 34", () => {
      const result = getWetbulbInfo(34.1, "C");
      expect(result.level).toBe("Theoretical Limit");
      expect(result.color).toBe("text-purple-800");
      expect(result.value).toBe("34.1°C");
    });

    it("should return Theoretical Limit for very high wetbulb values", () => {
      const result = getWetbulbInfo(40, "C");
      expect(result.level).toBe("Theoretical Limit");
      expect(result.color).toBe("text-purple-800");
      expect(result.value).toBe("40.0°C");
    });

    it("should format value to 1 decimal place", () => {
      const result1 = getWetbulbInfo(26.678, "C");
      expect(result1.value).toBe("26.7°C");

      const result2 = getWetbulbInfo(26.123, "C");
      expect(result2.value).toBe("26.1°C");
    });
  });

  describe("getWetbulbDescription", () => {
    it("should return description for average measure type", () => {
      const result = getWetbulbDescription(26, "avg", {
        unit: "C",
        year: 2024,
      });
      expect(result.prefix).toBe(
        "The 2024 annual average wetbulb temperature is",
      );
      expect(result.value).toBe("26.0°C");
      expect(result.colorClass).toBe("text-amber-600");
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should return description for max measure type", () => {
      const result = getWetbulbDescription(28, "max", {
        unit: "C",
        year: 2023,
      });
      expect(result.prefix).toBe("The 2023 annual max wetbulb temperature is");
      expect(result.value).toBe("28.0°C");
      expect(result.colorClass).toBe("text-orange-600");
    });

    it("should use default year 2026 when not provided", () => {
      const result = getWetbulbDescription(22, "avg", { unit: "C" });
      expect(result.prefix).toBe(
        "The 2026 annual average wetbulb temperature is",
      );
    });

    it("should handle None level", () => {
      const result = getWetbulbDescription(16, "avg", {
        unit: "C",
        year: 2024,
      });
      expect(result.colorClass).toBe("text-green-600");
      expect(result.value).toBe("16.0°C");
    });

    it("should handle Theoretical Limit level", () => {
      const result = getWetbulbDescription(36, "max", {
        unit: "C",
        year: 2024,
      });
      expect(result.colorClass).toBe("text-purple-800");
      expect(result.value).toBe("36.0°C");
    });
  });

  describe("getForecastWetbulbDescription", () => {
    it("should return forecast description with confidence range", () => {
      const result = getForecastWetbulbDescription(26, 2050, {
        lowerBound10: 25,
        unit: "C",
        upperBound90: 28,
      });
      expect(result.prefix).toBe("By end of 2050, it could be");
      expect(result.value).toBe("26.0°C");
      expect(result.colorClass).toBe("text-amber-600");
      expect(result.confidenceRange).toBe("(10-90%: 25.0-28.0°C)");
    });

    it("should handle forecast without confidence bounds", () => {
      const result = getForecastWetbulbDescription(26, 2050, { unit: "C" });
      expect(result.prefix).toBe("By end of 2050, it could be");
      expect(result.value).toBe("26.0°C");
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should handle NaN lower bound", () => {
      const result = getForecastWetbulbDescription(26, 2050, {
        lowerBound10: Number.NaN,
        unit: "C",
        upperBound90: 28,
      });
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should handle NaN upper bound", () => {
      const result = getForecastWetbulbDescription(26, 2050, {
        lowerBound10: 25,
        unit: "C",
        upperBound90: Number.NaN,
      });
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should not show confidence range when bounds are too close (< 0.1)", () => {
      const result = getForecastWetbulbDescription(26, 2050, {
        lowerBound10: 26.01,
        unit: "C",
        upperBound90: 26.05,
      });
      expect(result.confidenceRange).toBeUndefined();
    });

    it("should show confidence range when bounds are more than 0.1 apart", () => {
      const result = getForecastWetbulbDescription(26, 2050, {
        lowerBound10: 25.9,
        unit: "C",
        upperBound90: 26.1,
      });
      expect(result.confidenceRange).toBe("(10-90%: 25.9-26.1°C)");
    });

    it("should handle None forecast", () => {
      const result = getForecastWetbulbDescription(16, 2050, {
        lowerBound10: 14,
        unit: "C",
        upperBound90: 18,
      });
      expect(result.colorClass).toBe("text-green-600");
      expect(result.value).toBe("16.0°C");
      expect(result.confidenceRange).toBe("(10-90%: 14.0-18.0°C)");
    });

    it("should handle Moderate Risk forecast", () => {
      const result = getForecastWetbulbDescription(26, 2050, {
        lowerBound10: 24,
        unit: "C",
        upperBound90: 27,
      });
      expect(result.colorClass).toBe("text-amber-600");
      expect(result.value).toBe("26.0°C");
    });

    it("should handle High Risk forecast", () => {
      const result = getForecastWetbulbDescription(28, 2050, {
        lowerBound10: 27,
        unit: "C",
        upperBound90: 29,
      });
      expect(result.colorClass).toBe("text-orange-600");
      expect(result.value).toBe("28.0°C");
    });

    it("should handle Theoretical Limit forecast", () => {
      const result = getForecastWetbulbDescription(36, 2050, {
        lowerBound10: 35,
        unit: "C",
        upperBound90: 38,
      });
      expect(result.colorClass).toBe("text-purple-800");
      expect(result.value).toBe("36.0°C");
      expect(result.confidenceRange).toBe("(10-90%: 35.0-38.0°C)");
    });

    it("should format confidence range values to 1 decimal place", () => {
      const result = getForecastWetbulbDescription(26, 2050, {
        lowerBound10: 24.456,
        unit: "C",
        upperBound90: 27.892,
      });
      expect(result.confidenceRange).toBe("(10-90%: 24.5-27.9°C)");
    });

    it("should handle different forecast years", () => {
      const result1 = getForecastWetbulbDescription(26, 2030, {
        lowerBound10: 25,
        unit: "C",
        upperBound90: 27,
      });
      expect(result1.prefix).toBe("By end of 2030, it could be");

      const result2 = getForecastWetbulbDescription(26, 2100, {
        lowerBound10: 25,
        unit: "C",
        upperBound90: 27,
      });
      expect(result2.prefix).toBe("By end of 2100, it could be");
    });
  });
});
