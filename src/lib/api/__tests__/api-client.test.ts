import { FetchError } from "@/lib/utils/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiRequest,
  type ApiResponse,
  hasError,
  parseWithFetchError,
} from "../api-client";

vi.mock("@sentry/nextjs", () => ({
  captureException: mockFn(),
}));

vi.mock("@/lib/utils/errors", () => ({
  FetchError: class MockFetchError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "FetchError";
    }
  },
}));

const createDelay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe("api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("apiRequest", () => {
    it("should return successful response when request succeeds", async () => {
      const mockData = { id: 1, name: "Test Data" };
      const mockRequestFunction = mockFn().mockResolvedValue(mockData);

      const result = await apiRequest(mockRequestFunction);

      expect(result).toStrictEqual({
        data: mockData,
        error: undefined,
      });
      expect(mockRequestFunction).toHaveBeenCalledTimes(1);
    });

    it("should return error response when request fails with Error", async () => {
      const mockError = new Error("Test error message");
      const mockRequestFunction = mockFn().mockRejectedValue(mockError);

      const result = await apiRequest(mockRequestFunction);

      expect(result).toStrictEqual({
        data: undefined,
        error: {
          code: "UNKNOWN_ERROR",
          message: "Test error message",
          status: 500,
        },
      });
      expect(mockRequestFunction).toHaveBeenCalledTimes(1);
    });

    it("should return error response when request fails with FetchError", async () => {
      const mockError = new FetchError("Fetch failed");
      const mockRequestFunction = mockFn().mockRejectedValue(mockError);

      const result = await apiRequest(mockRequestFunction);

      expect(result).toStrictEqual({
        data: undefined,
        error: {
          code: "FETCH_ERROR",
          message: "Fetch failed",
          status: 500,
        },
      });
      expect(mockRequestFunction).toHaveBeenCalledTimes(1);
    });

    it("should return error response when request fails with non-Error object", async () => {
      const mockError = "String error";
      const mockRequestFunction = mockFn().mockRejectedValue(mockError);

      const result = await apiRequest(mockRequestFunction);

      expect(result).toStrictEqual({
        data: undefined,
        error: {
          code: "UNKNOWN_ERROR",
          message: "An unknown error occurred",
          status: 500,
        },
      });
      expect(mockRequestFunction).toHaveBeenCalledTimes(1);
    });

    it("should call error handler when provided and error is an Error instance", async () => {
      const mockError = new Error("Test error");
      const mockRequestFunction = mockFn().mockRejectedValue(mockError);
      const mockErrorHandler = mockFn();

      await apiRequest(mockRequestFunction, mockErrorHandler);

      expect(mockErrorHandler).toHaveBeenCalledWith(mockError);
      expect(mockErrorHandler).toHaveBeenCalledTimes(1);
    });

    it("should call error handler when provided and error is a FetchError instance", async () => {
      const mockError = new FetchError("Fetch error");
      const mockRequestFunction = mockFn().mockRejectedValue(mockError);
      const mockErrorHandler = mockFn();

      await apiRequest(mockRequestFunction, mockErrorHandler);

      expect(mockErrorHandler).toHaveBeenCalledWith(mockError);
      expect(mockErrorHandler).toHaveBeenCalledTimes(1);
    });

    it("should not call error handler when error is not an Error instance", async () => {
      const mockError = "String error";
      const mockRequestFunction = mockFn().mockRejectedValue(mockError);
      const mockErrorHandler = mockFn();

      await apiRequest(mockRequestFunction, mockErrorHandler);

      expect(mockErrorHandler).not.toHaveBeenCalled();
    });

    it("should not call error handler when not provided", async () => {
      const mockError = new Error("Test error");
      const mockRequestFunction = mockFn().mockRejectedValue(mockError);

      const result = await apiRequest(mockRequestFunction);

      expect(result.error).toBeDefined();
    });

    it("should handle successful request with different data types", async () => {
      const testCases = [
        { data: "string data" },
        { data: 12_345 },
        { data: true },
        { data: [] },
        { data: {} },
        { data: undefined },
        { data: undefined },
      ];

      const results = await Promise.all(
        testCases.map(async (testCase) => {
          const mockRequestFunction = mockFn().mockResolvedValue(testCase.data);
          const result = await apiRequest(mockRequestFunction);

          return { result, testCase };
        }),
      );

      for (const { result, testCase } of results) {
        expect(result).toStrictEqual({
          data: testCase.data,
          error: undefined,
        });
      }
    });

    it("should handle multiple concurrent requests", async () => {
      const mockData1 = { id: 1 };
      const mockData2 = { id: 2 };
      const mockRequestFunction1 = mockFn().mockResolvedValue(mockData1);
      const mockRequestFunction2 = mockFn().mockResolvedValue(mockData2);

      const [result1, result2] = await Promise.all([
        apiRequest(mockRequestFunction1),
        apiRequest(mockRequestFunction2),
      ]);

      expect(result1.data).toStrictEqual(mockData1);
      expect(result2.data).toStrictEqual(mockData2);
      expect(result1.error).toBeUndefined();
      expect(result2.error).toBeUndefined();
    });

    it("should handle async request function correctly", async () => {
      const mockData = { async: true };
      const mockRequestFunction = mockFn(async () => {
        await createDelay(10);
        return mockData;
      });

      const result = await apiRequest(mockRequestFunction);

      expect(result.data).toStrictEqual(mockData);
      expect(result.error).toBeUndefined();
    });
  });

  describe("parseWithFetchError", () => {
    it("rethrows non-schema-validation errors unchanged", () => {
      const originalError = new Error("Boom");
      const parser = () => {
        throw originalError;
      };

      expect(() => parseWithFetchError("Forecast", parser, {})).toThrow(
        originalError,
      );
    });
  });

  describe("hasError", () => {
    it("should return true for error response", () => {
      const errorResponse: ApiResponse<any> = {
        data: undefined,
        error: {
          code: "TEST_ERROR",
          message: "Test error message",
          status: 400,
        },
      };

      expect(hasError(errorResponse)).toBe(true);
    });

    it("should return false for successful response", () => {
      const successResponse: ApiResponse<any> = {
        data: { id: 1, name: "Test" },
        error: undefined,
      };

      expect(hasError(successResponse)).toBe(false);
    });
  });
});
