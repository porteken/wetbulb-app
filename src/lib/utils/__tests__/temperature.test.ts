import { describe, expect, it } from "vitest";

import {
  celsiusToFahrenheit,
  convertFromFahrenheit,
  fahrenheitDeltaToCelsius,
  fahrenheitToCelsius,
  formatTemperature,
} from "../temperature";

describe("temperature", () => {
  describe("fahrenheitToCelsius", () => {
    it("should convert exactly with no rounding", () => {
      expect(fahrenheitToCelsius(68)).toBe(20);
      expect(fahrenheitToCelsius(95)).toBe(35);
    });

    it("should return the precise fractional value", () => {
      expect(fahrenheitToCelsius(80)).toBeCloseTo(26.6667, 4);
    });
  });

  describe("celsiusToFahrenheit", () => {
    it("should round to the nearest whole Fahrenheit degree", () => {
      expect(celsiusToFahrenheit(20)).toBe(68);
      expect(celsiusToFahrenheit(25)).toBe(77);
      expect(celsiusToFahrenheit(27)).toBe(81);
      expect(celsiusToFahrenheit(29)).toBe(84);
      expect(celsiusToFahrenheit(31)).toBe(88);
      expect(celsiusToFahrenheit(35)).toBe(95);
    });
  });

  describe("fahrenheitDeltaToCelsius", () => {
    it("should scale a rate/delta without applying the +32 offset", () => {
      expect(fahrenheitDeltaToCelsius(1.8)).toBeCloseTo(1, 5);
      expect(fahrenheitDeltaToCelsius(0)).toBe(0);
      expect(fahrenheitDeltaToCelsius(-9)).toBeCloseTo(-5, 5);
    });
  });

  describe("convertFromFahrenheit", () => {
    it("should return the value unchanged for unit F", () => {
      expect(convertFromFahrenheit(80, "F")).toBe(80);
    });

    it("should convert to Celsius for unit C", () => {
      expect(convertFromFahrenheit(80, "C")).toBeCloseTo(26.6667, 4);
    });
  });

  describe("formatTemperature", () => {
    it("should format Fahrenheit values with the °F suffix", () => {
      expect(formatTemperature(80, "F")).toBe("80.0°F");
    });

    it("should format Celsius values with the °C suffix", () => {
      expect(formatTemperature(80, "C")).toBe("26.7°C");
    });

    it("should support a custom decimal precision", () => {
      expect(formatTemperature(80, "C", 0)).toBe("27°C");
    });
  });
});
