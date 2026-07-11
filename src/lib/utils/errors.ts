const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

export type ErrorContext = Record<string, unknown> & {
  field?: string;
  resource?: string;
};

interface AppErrorOptions {
  context?: ErrorContext;
  originalError?: unknown;
}

export class AppError extends Error {
  public readonly originalError?: unknown;
  public readonly context?: ErrorContext;

  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string,
    statusCode = HTTP_INTERNAL_ERROR,
    options?: AppErrorOptions,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = options?.originalError;
    this.context = options?.context;
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication failed",
    originalError?: unknown,
  ) {
    super(message, "AUTHENTICATION_ERROR", HTTP_UNAUTHORIZED, {
      originalError,
    });
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied", originalError?: unknown) {
    super(message, "AUTHORIZATION_ERROR", HTTP_FORBIDDEN, { originalError });
    this.name = "AuthorizationError";
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    originalError?: unknown,
    context?: ErrorContext,
  ) {
    super(message, "DATABASE_ERROR", HTTP_INTERNAL_ERROR, {
      context,
      originalError,
    });
    this.name = "DatabaseError";
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    originalError?: unknown,
    context?: ErrorContext,
  ) {
    super(message, "NETWORK_ERROR", statusCode, { context, originalError });
    this.name = "NetworkError";
  }
}

export class FetchError extends NetworkError {
  constructor(message: string, originalError?: unknown) {
    super(message, HTTP_INTERNAL_ERROR, originalError);
    this.name = "FetchError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, resource?: string, originalError?: unknown) {
    super(message, "NOT_FOUND_ERROR", HTTP_NOT_FOUND, {
      context: { resource },
      originalError,
    });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, originalError?: unknown) {
    super(message, "VALIDATION_ERROR", HTTP_BAD_REQUEST, {
      context: { field },
      originalError,
    });
    this.name = "ValidationError";
  }
}

export const classifyDbError = (
  error: unknown,
  context?: ErrorContext,
): DatabaseError => {
  if (error instanceof DatabaseError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "Database error occurred";
  return new DatabaseError(message, error, context);
};

export const createError = (
  message: string,
  statusCode: number = HTTP_INTERNAL_ERROR,
  originalError?: unknown,
  context?: ErrorContext,
): AppError => {
  if (statusCode === HTTP_BAD_REQUEST) {
    return new ValidationError(message, context?.field, originalError);
  }

  if (statusCode === HTTP_UNAUTHORIZED) {
    return new AuthenticationError(message, originalError);
  }

  if (statusCode === HTTP_FORBIDDEN) {
    return new AuthorizationError(message, originalError);
  }

  if (statusCode === HTTP_NOT_FOUND) {
    return new NotFoundError(message, context?.resource, originalError);
  }

  if (statusCode >= HTTP_INTERNAL_ERROR) {
    return new DatabaseError(message, originalError, context);
  }

  return new NetworkError(message, statusCode, originalError, context);
};

const hasPgCode = (error: unknown): error is { code: string } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string";

const PG_DB_ERROR_CODES = new Set([
  "08000",
  "08003",
  "08006", // connection errors
  "40P01", // deadlock
  "55P03", // lock not available
  "57014", // statement canceled
  "42501", // insufficient privilege
  "42601", // syntax error
]);

export const handleAsyncError = (
  error: unknown,
  context?: ErrorContext,
): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (hasPgCode(error) && PG_DB_ERROR_CODES.has(error.code)) {
    const message =
      error instanceof Error ? error.message : "Database error occurred";
    return new DatabaseError(message, error, context);
  }

  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return new NetworkError(error.message, HTTP_INTERNAL_ERROR, error, context);
  }

  if (error instanceof Error) {
    const msgLower = error.message.toLowerCase();
    if (
      error.name === "NetworkError" ||
      msgLower.includes("network") ||
      error.message.includes("fetch")
    ) {
      return new NetworkError(
        error.message,
        HTTP_INTERNAL_ERROR,
        error,
        context,
      );
    }

    if (hasPgCode(error) || msgLower.includes("database")) {
      return new DatabaseError(error.message, error, context);
    }

    return new AppError(error.message, "UNKNOWN_ERROR", HTTP_INTERNAL_ERROR, {
      context,
      originalError: error,
    });
  }

  const message =
    typeof error === "string" ? error : "An unknown error occurred";
  return new AppError(message, "UNKNOWN_ERROR", HTTP_INTERNAL_ERROR, {
    context,
    originalError: error,
  });
};
