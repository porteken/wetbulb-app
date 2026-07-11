import { describe, expect, it } from "vitest";

import {
  celsiusDeltaToFahrenheit,
  celsiusToFahrenheit,
  convertFromCelsius,
  fahrenheitToCelsius,
  formatTemperature,
  roundedCelsiusToFahrenheit,
} from "../temperature";

describe("temperature", () => {
  describe("celsiusToFahrenheit", () => {
    it("should convert exactly with no rounding", () => {
      expect(celsiusToFahrenheit(20)).toBe(68);
      expect(celsiusToFahrenheit(35)).toBe(95);
    });

    it("should return the precise fractional value", () => {
      expect(celsiusToFahrenheit(26.6667)).toBeCloseTo(80, 3);
    });
  });

  describe("fahrenheitToCelsius", () => {
    it("should convert exactly with no rounding", () => {
      expect(fahrenheitToCelsius(68)).toBe(20);
      expect(fahrenheitToCelsius(95)).toBe(35);
    });
  });

  describe("roundedCelsiusToFahrenheit", () => {
    it("should round to the nearest whole Fahrenheit degree", () => {
      expect(roundedCelsiusToFahrenheit(20)).toBe(68);
      expect(roundedCelsiusToFahrenheit(25)).toBe(77);
      expect(roundedCelsiusToFahrenheit(27)).toBe(81);
      expect(roundedCelsiusToFahrenheit(29)).toBe(84);
      expect(roundedCelsiusToFahrenheit(31)).toBe(88);
      expect(roundedCelsiusToFahrenheit(35)).toBe(95);
    });
  });

  describe("celsiusDeltaToFahrenheit", () => {
    it("should scale a rate/delta without applying the +32 offset", () => {
      expect(celsiusDeltaToFahrenheit(1)).toBeCloseTo(1.8, 5);
      expect(celsiusDeltaToFahrenheit(0)).toBe(0);
      expect(celsiusDeltaToFahrenheit(-5)).toBeCloseTo(-9, 5);
    });
  });

  describe("convertFromCelsius", () => {
    it("should return the value unchanged for unit C", () => {
      expect(convertFromCelsius(26.6667, "C")).toBe(26.6667);
    });

    it("should convert to Fahrenheit for unit F", () => {
      expect(convertFromCelsius(26.6667, "F")).toBeCloseTo(80, 3);
    });
  });

  describe("formatTemperature", () => {
    it("should format Celsius values with the °C suffix", () => {
      expect(formatTemperature(26.6667, "C")).toBe("26.7°C");
    });

    it("should format Fahrenheit values with the °F suffix", () => {
      expect(formatTemperature(26.6667, "F")).toBe("80.0°F");
    });

    it("should support a custom decimal precision", () => {
      expect(formatTemperature(26.6667, "F", 0)).toBe("80°F");
    });
  });
});
