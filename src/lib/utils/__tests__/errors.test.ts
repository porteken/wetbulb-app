import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  createError,
  DatabaseError,
  FetchError,
  handleAsyncError,
  NetworkError,
  NotFoundError,
  ValidationError,
} from "../errors";

vi.mock("@sentry/nextjs", () => ({
  captureException: mockFn(),
}));

describe("error Classes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("appError", () => {
    it("should create an AppError with basic properties", () => {
      const error = new AppError("Test message", "TEST_CODE");

      expect(error.message).toBe("Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("AppError");
      expect(error.originalError).toBeUndefined();
    });

    it("should create an AppError with custom status code", () => {
      const error = new AppError("Not found", "NOT_FOUND", 404);

      expect(error.message).toBe("Not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("AppError");
    });

    it("should create an AppError with original error", () => {
      const originalError = new Error("Original error");
      const error = new AppError("Wrapped error", "WRAP_ERROR", 500, {
        originalError,
      });

      expect(error.message).toBe("Wrapped error");
      expect(error.code).toBe("WRAP_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("AppError");
    });
  });

  describe("databaseError", () => {
    it("should create a DatabaseError with basic properties", () => {
      const error = new DatabaseError("Database connection failed");

      expect(error.message).toBe("Database connection failed");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("DatabaseError");
      expect(error.originalError).toBeUndefined();
    });

    it("should create a DatabaseError with original error", () => {
      const originalError = new Error("Connection timeout");
      const error = new DatabaseError("Database error", originalError);

      expect(error.message).toBe("Database error");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("DatabaseError");
    });
  });

  describe("authenticationError", () => {
    it("should create an AuthenticationError with default message", () => {
      const error = new AuthenticationError();

      expect(error.message).toBe("Authentication failed");
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe("AuthenticationError");
      expect(error.originalError).toBeUndefined();
    });

    it("should create an AuthenticationError with original error", () => {
      const originalError = new Error("Token expired");
      const error = new AuthenticationError(
        "Authentication failed",
        originalError,
      );

      expect(error.message).toBe("Authentication failed");
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("AuthenticationError");
    });
  });

  describe("authorizationError", () => {
    it("should create an AuthorizationError with default message", () => {
      const error = new AuthorizationError();

      expect(error.message).toBe("Access denied");
      expect(error.code).toBe("AUTHORIZATION_ERROR");
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe("AuthorizationError");
      expect(error.originalError).toBeUndefined();
    });

    it("should create an AuthorizationError with original error", () => {
      const originalError = new Error("Permission denied");
      const error = new AuthorizationError("Access denied", originalError);

      expect(error.message).toBe("Access denied");
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("AuthorizationError");
    });
  });

  describe("networkError", () => {
    it("should create a NetworkError with basic properties", () => {
      const error = new NetworkError("Network failed", 503);

      expect(error.message).toBe("Network failed");
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe("NetworkError");
      expect(error.originalError).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it("should create a NetworkError with original error and context", () => {
      const originalError = new Error("Connection timeout");
      const context = { timeout: 5000, url: "https://api.example.com" };
      const error = new NetworkError(
        "Network error",
        504,
        originalError,
        context,
      );

      expect(error.message).toBe("Network error");
      expect(error.statusCode).toBe(504);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toStrictEqual(context);
      expect(error.name).toBe("NetworkError");
    });
  });

  describe("notFoundError", () => {
    it("should create a NotFoundError with basic properties", () => {
      const error = new NotFoundError("Resource not found");

      expect(error.message).toBe("Resource not found");
      expect(error.code).toBe("NOT_FOUND_ERROR");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("NotFoundError");
      expect(error.originalError).toBeUndefined();
      expect(error.context).toStrictEqual({ resource: undefined });
    });

    it("should create a NotFoundError with resource and original error", () => {
      const originalError = new Error("Database record not found");
      const error = new NotFoundError("User not found", "user", originalError);

      expect(error.message).toBe("User not found");
      expect(error.code).toBe("NOT_FOUND_ERROR");
      expect(error.statusCode).toBe(404);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toStrictEqual({ resource: "user" });
      expect(error.name).toBe("NotFoundError");
    });
  });

  describe("validationError", () => {
    it("should create a ValidationError with basic properties", () => {
      const error = new ValidationError("Validation failed");

      expect(error.message).toBe("Validation failed");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("ValidationError");
      expect(error.originalError).toBeUndefined();
      expect(error.context).toStrictEqual({ field: undefined });
    });

    it("should create a ValidationError with field and original error", () => {
      const originalError = new Error("Invalid email format");
      const error = new ValidationError(
        "Email is invalid",
        "email",
        originalError,
      );

      expect(error.message).toBe("Email is invalid");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toStrictEqual({ field: "email" });
      expect(error.name).toBe("ValidationError");
    });
  });

  describe("appError with context", () => {
    it("should create an AppError with context", () => {
      const context = { action: "delete", userId: 123 };
      const error = new AppError("Context test", "TEST_CODE", 500, {
        context,
      });

      expect(error.message).toBe("Context test");
      expect(error.code).toBe("TEST_CODE");
      expect(error.context).toStrictEqual(context);
    });

    it("should create a DatabaseError with context", () => {
      const originalError = new Error("Query failed");
      const context = { query: "SELECT * FROM users", table: "users" };
      const error = new DatabaseError(
        "Database query failed",
        originalError,
        context,
      );

      expect(error.message).toBe("Database query failed");
      expect(error.originalError).toBe(originalError);
      expect(error.context).toStrictEqual(context);
    });
  });

  describe("error Factory", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("createError", () => {
      it("should create a ValidationError for status code 400", () => {
        const error = createError("Invalid input", 400);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe("Invalid input");
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe("VALIDATION_ERROR");
      });

      it("should create a ValidationError with field context", () => {
        const error = createError("Invalid input", 400, undefined, {
          field: "username",
        });

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.context).toStrictEqual({ field: "username" });
      });

      it("should create an AuthenticationError for status code 401", () => {
        const error = createError("Unauthorized", 401);

        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toBe("Unauthorized");
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe("AUTHENTICATION_ERROR");
      });

      it("should create an AuthorizationError for status code 403", () => {
        const error = createError("Forbidden", 403);

        expect(error).toBeInstanceOf(AuthorizationError);
        expect(error.message).toBe("Forbidden");
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe("AUTHORIZATION_ERROR");
      });

      it("should create a NotFoundError for status code 404", () => {
        const error = createError("Not found", 404);

        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.message).toBe("Not found");
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe("NOT_FOUND_ERROR");
      });

      it("should create a NotFoundError with resource context", () => {
        const error = createError("Not found", 404, undefined, {
          resource: "user",
        });

        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.context).toStrictEqual({ resource: "user" });
      });

      it("should create a DatabaseError for status code 500", () => {
        const error = createError("Internal server error", 500);

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.message).toBe("Internal server error");
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe("DATABASE_ERROR");
      });

      it("should create a DatabaseError for status codes >= 500", () => {
        const error = createError("Service unavailable", 503);

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.statusCode).toBe(500);
      });

      it("should use default status code 500 when not provided", () => {
        const error = createError("Default error");

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.statusCode).toBe(500);
      });
      it("should use default when error is not in switch", () => {
        const error = createError("Default error", 305);

        expect(error).toBeInstanceOf(NetworkError);
        expect(error.statusCode).toBe(305);
      });

      it("should pass original error to created error", () => {
        const originalError = new Error("Original");
        const error = createError("Wrapped", 400, originalError);

        expect(error.originalError).toBe(originalError);
      });

      it("should pass context to created error", () => {
        const context = { test: "value" };
        const error = createError("Test", 400, undefined, context);

        expect(error.context).toStrictEqual({ field: undefined });
      });
    });
  });

  describe("error Handler", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("handleAsyncError", () => {
      it("should return the same error if it's already an AppError", () => {
        const appError = new AppError("Test error", "TEST_CODE");
        const result = handleAsyncError(appError);

        expect(result).toBe(appError);
      });
      it("should handle network error", () => {
        const error = new Error("network request failed");
        const result = handleAsyncError(error);

        expect(result).toBeInstanceOf(NetworkError);
        expect(result.message).toBe("network request failed");
        expect(result.statusCode).toBe(500);
        expect(result.originalError).toBe(error);
      });

      it("should convert Error with network message to NetworkError", () => {
        const error = new Error("Network connection failed");
        const result = handleAsyncError(error);

        expect(result).toBeInstanceOf(NetworkError);
        expect(result.message).toBe("Network connection failed");
        expect(result.statusCode).toBe(500);
        expect(result.originalError).toBe(error);
      });

      it("should convert Error with fetch message to AppError", () => {
        const error = new Error("Fetch request failed");
        const result = handleAsyncError(error);

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe("Fetch request failed");
        expect(result.statusCode).toBe(500);
      });

      it("should convert Error with database message to DatabaseError", () => {
        const error = new Error("Database connection timeout");
        const result = handleAsyncError(error);

        expect(result).toBeInstanceOf(DatabaseError);
        expect(result.message).toBe("Database connection timeout");
        expect(result.originalError).toBe(error);
      });

      it("should convert Error with connection message to AppError", () => {
        const error = new Error("Connection pool exhausted");
        const result = handleAsyncError(error);

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe("Connection pool exhausted");
      });

      it("should convert generic Error to AppError", () => {
        const error = new Error("Generic error message");
        const result = handleAsyncError(error);

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe("Generic error message");
        expect(result.code).toBe("UNKNOWN_ERROR");
        expect(result.statusCode).toBe(500);
        expect(result.originalError).toBe(error);
      });

      it("should handle string errors", () => {
        const result = handleAsyncError("String error message");

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe("String error message");
        expect(result.code).toBe("UNKNOWN_ERROR");
        expect(result.statusCode).toBe(500);
        expect(result.originalError).toBe("String error message");
      });

      it("should handle non-string, non-Error objects", () => {
        const errorObject = { code: 500, details: "Something went wrong" };
        const result = handleAsyncError(errorObject);

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe("An unknown error occurred");
        expect(result.code).toBe("UNKNOWN_ERROR");
        expect(result.statusCode).toBe(500);
        expect(result.originalError).toBe(errorObject);
      });

      it("should handle null and undefined errors", () => {
        const nullResult = handleAsyncError(undefined as any);
        const undefinedResult = handleAsyncError(undefined as any);

        expect(nullResult.message).toBe("An unknown error occurred");
        expect(undefinedResult.message).toBe("An unknown error occurred");
      });

      it("should pass context to created errors", () => {
        const context = { requestId: "123", userId: "456" };
        const error = new Error("Test error");
        const result = handleAsyncError(error, context);

        expect(result.context).toStrictEqual(context);
      });
    });
  });

  describe("fetchError", () => {
    it("should create a FetchError with basic properties", () => {
      const error = new FetchError("Fetch failed");

      expect(error.message).toBe("Fetch failed");
      expect(error.name).toBe("FetchError");
      expect(error.originalError).toBeUndefined();
    });

    it("should create a FetchError with original error", () => {
      const originalError = new Error("Network error");
      const error = new FetchError("Fetch error", originalError);

      expect(error.message).toBe("Fetch error");
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("FetchError");
    });
  });
});
