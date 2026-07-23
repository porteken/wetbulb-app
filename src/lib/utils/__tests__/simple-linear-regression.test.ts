import { describe, expect, it } from "vitest";

import { SimpleLinearRegression } from "../simple-linear-regression";

describe("simpleLinearRegression", () => {
  describe("constructor", () => {
    it("should create instance with valid data", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      expect(() => new SimpleLinearRegression(x, y)).not.toThrow();
    });

    it("should throw TypeError when x is not an array", () => {
      expect(
        () => new SimpleLinearRegression(undefined as any, [1, 2, 3]),
      ).toThrow("x and y must be arrays");
    });

    it("should throw TypeError when y is not an array", () => {
      expect(
        () => new SimpleLinearRegression([1, 2, 3], undefined as any),
      ).toThrow("x and y must be arrays");
    });

    it("should throw Error when arrays have different lengths", () => {
      expect(() => new SimpleLinearRegression([1, 2], [1, 2, 3])).toThrow(
        "x and y must have the same length",
      );
    });

    it("should throw Error when arrays are empty", () => {
      expect(() => new SimpleLinearRegression([], [])).toThrow(
        "x and y must not be empty",
      );
    });
  });

  describe("predict", () => {
    it("should predict correctly for perfect linear relationship", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.predict(6)).toBeCloseTo(12, 10);
      expect(regression.predict(0)).toBeCloseTo(0, 10);
      expect(regression.predict(10)).toBeCloseTo(20, 10);
    });

    it("should predict correctly for linear relationship with intercept", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 5, 7, 9, 11];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.predict(6)).toBeCloseTo(13, 10);
      expect(regression.predict(0)).toBeCloseTo(1, 10);
    });

    it("should handle negative values", () => {
      const x = [-2, -1, 0, 1, 2];
      const y = [-4, -2, 0, 2, 4];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.predict(3)).toBeCloseTo(6, 10);
      expect(regression.predict(-3)).toBeCloseTo(-6, 10);
    });

    it("should handle single data point as flat line at y value", () => {
      const x = [5];
      const y = [10];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.slope).toBe(0);
      expect(regression.predict(5)).toBe(10);
      expect(regression.predict(0)).toBe(10);
      expect(regression.predict(100)).toBe(10);
    });

    it("should handle horizontal line (all y values same)", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 5, 5, 5, 5];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.predict(0)).toBe(5);
      expect(regression.predict(10)).toBe(5);
      expect(regression.predict(100)).toBe(5);
    });

    it("should handle decimal values", () => {
      const x = [1.5, 2.5, 3.5, 4.5];
      const y = [3, 5, 7, 9];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.predict(5.5)).toBeCloseTo(11, 5);
    });

    it("should be consistent with multiple predictions", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2.1, 3.9, 6.1, 7.9, 10.1];
      const regression = new SimpleLinearRegression(x, y);

      const prediction1 = regression.predict(6);
      const prediction2 = regression.predict(6);

      expect(prediction1).toBe(prediction2);
    });
  });

  describe("predictWithConfidence", () => {
    it.each([
      { level: 0.5, label: "0.5" },
      { level: 0.75, label: "0.75" },
      { level: 0.8, label: "0.8" },
      { level: 0.95, label: "0.95" },
      { level: 0.99, label: "0.99" },
      { level: undefined, label: "default (0.8)" },
    ])("should support $label confidence level", ({ level }) => {
      const x = [1, 2, 3, 4, 5];
      const y = [2.1, 3.9, 6.2, 7.8, 10.1];
      const regression = new SimpleLinearRegression(x, y);

      const result = regression.predictWithConfidence(6, level);

      expect(result).toHaveProperty("prediction");
      expect(result).toHaveProperty("lowerBound");
      expect(result).toHaveProperty("upperBound");
      expect(result.prediction).toBeCloseTo(12, 0);
      expect(result.lowerBound).toBeLessThan(result.prediction);
      expect(result.upperBound).toBeGreaterThan(result.prediction);
    });

    it("should have wider interval for higher confidence level", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2.1, 3.9, 6.2, 7.8, 10.1];
      const regression = new SimpleLinearRegression(x, y);

      const result80 = regression.predictWithConfidence(6, 0.8);
      const result95 = regression.predictWithConfidence(6, 0.95);

      const interval80 = result80.upperBound - result80.lowerBound;
      const interval95 = result95.upperBound - result95.lowerBound;

      expect(interval95).toBeGreaterThan(interval80);
    });

    it("should handle prediction with noisy data", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2.5, 3.8, 6.2, 7.7, 10.3];
      const regression = new SimpleLinearRegression(x, y);

      const result = regression.predictWithConfidence(6);

      expect(Number.isFinite(result.prediction)).toBe(true);
      expect(Number.isFinite(result.lowerBound)).toBe(true);
      expect(Number.isFinite(result.upperBound)).toBe(true);
    });

    it("should have prediction equal to predict() result", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2.1, 3.9, 6.2, 7.8, 10.1];
      const regression = new SimpleLinearRegression(x, y);

      const prediction = regression.predict(6);
      const confidenceResult = regression.predictWithConfidence(6);

      expect(confidenceResult.prediction).toBe(prediction);
    });
  });

  describe("slope property", () => {
    it("should expose slope as public readonly property", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.slope).toBeCloseTo(2, 10);
    });

    it("should calculate correct slope for negative correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.slope).toBeCloseTo(-2, 10);
    });
  });

  describe("edge cases", () => {
    it("should handle very large numbers", () => {
      const x = [1_000_000, 2_000_000, 3_000_000];
      const y = [2_000_000, 4_000_000, 6_000_000];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.predict(4_000_000)).toBeCloseTo(8_000_000, 0);
    });

    it("should handle very small numbers", () => {
      const x = [0.001, 0.002, 0.003];
      const y = [0.002, 0.004, 0.006];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.predict(0.004)).toBeCloseTo(0.008, 6);
    });

    it("should handle constant x values as flat line at mean y", () => {
      const x = [5, 5, 5];
      const y = [1, 2, 3];
      const regression = new SimpleLinearRegression(x, y);

      expect(regression.slope).toBe(0);
      expect(Number.isFinite(regression.predict(5))).toBe(true);
      expect(Number.isFinite(regression.predict(0))).toBe(true);
      expect(regression.predict(5)).toBe(2);
    });

    it("should produce finite confidence bounds with constant x values", () => {
      const x = [5, 5, 5, 5, 5];
      const y = [1, 2, 3, 4, 5];
      const regression = new SimpleLinearRegression(x, y);

      const result = regression.predictWithConfidence(5);
      expect(Number.isFinite(result.prediction)).toBe(true);
      expect(Number.isFinite(result.lowerBound)).toBe(true);
      expect(Number.isFinite(result.upperBound)).toBe(true);
    });

    it("should handle mixed positive and negative values", () => {
      const x = [-5, -2, 0, 3, 7];
      const y = [10, 4, 0, -6, -14];
      const regression = new SimpleLinearRegression(x, y);

      const prediction = regression.predict(1);
      expect(typeof prediction).toBe("number");
      expect(Number.isFinite(prediction)).toBe(true);
    });

    it("should return zero standard error for n <= 2", () => {
      const x = [1, 2];
      const y = [2, 4];
      const regression = new SimpleLinearRegression(x, y);

      const result = regression.predictWithConfidence(3, 0.8);
      expect(result.lowerBound).toBe(result.prediction);
      expect(result.upperBound).toBe(result.prediction);
    });
  });
});
