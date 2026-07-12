import {
  createError,
  type ErrorContext,
  NetworkError,
} from "@/lib/utils/errors";

const RETRY_DELAY_BASE = 1000;
const RETRY_DELAY_MAX = 5000;

const getDefaultErrorMessage = (statusCode: number): string => {
  switch (statusCode) {
    case 400: {
      return "Invalid request. Please check your input.";
    }
    case 401: {
      return "Authentication required. Please log in.";
    }
    case 403: {
      return "Access denied. You don't have permission to perform this action.";
    }
    case 404: {
      return "The requested resource was not found.";
    }
    case 422: {
      return "Validation failed. Please check your input.";
    }
    case 429: {
      return "Too many requests. Please try again later.";
    }
    case 500: {
      return "Internal server error. Please try again later.";
    }
    case 502: {
      return "Bad gateway. The server is temporarily unavailable.";
    }
    case 503: {
      return "Service unavailable. Please try again later.";
    }
    default: {
      return `Request failed with status ${statusCode}`;
    }
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const errorData: unknown = await response.json();

    if (typeof errorData === "string") {
      return errorData;
    }

    if (isRecord(errorData)) {
      if (typeof errorData.message === "string") {
        return errorData.message;
      }
      if (typeof errorData.error === "string") {
        return errorData.error;
      }
      if (typeof errorData.detail === "string") {
        return errorData.detail;
      }
    }

    return getDefaultErrorMessage(response.status);
  } catch {
    return getDefaultErrorMessage(response.status);
  }
};

export const handleApiResponse = async <T>(
  response: Response,
  parse: (data: unknown) => T,
  context?: ErrorContext,
): Promise<T> => {
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw createError(errorMessage, response.status, undefined, {
      ...context,
      url: response.url,
    });
  }

  try {
    const data: unknown = await response.json();
    return parse(data);
  } catch (parseError) {
    throw new NetworkError(
      "Failed to parse server response",
      500,
      parseError,
      context,
    );
  }
};

export const apiRequest = async <T>(
  url: string,
  parse: (data: unknown) => T,
  options: RequestInit = {},
  context?: ErrorContext,
): Promise<T> => {
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.headers instanceof Headers) {
    headers = { ...headers, ...Object.fromEntries(options.headers.entries()) };
  } else if (Array.isArray(options.headers)) {
    headers = { ...headers, ...Object.fromEntries(options.headers) };
  } else if (options.headers) {
    headers = { ...headers, ...options.headers };
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    return await handleApiResponse(response, parse, {
      ...context,
      method: options.method ?? "GET",
    });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError("Network connection failed", 0, error, context);
    }

    throw error;
  }
};

export const apiRequestWithRetry = async <T>(
  url: string,
  parse: (data: unknown) => T,
  options: RequestInit = {},
  retryConfig: { context?: ErrorContext; retries?: number } = {},
): Promise<T> => {
  const { context, retries = 3 } = retryConfig;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await apiRequest(url, parse, options, { ...context, attempt });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (
        error instanceof NetworkError &&
        error.statusCode >= 400 &&
        error.statusCode < 500 &&
        error.statusCode !== 429
      ) {
        throw error;
      }

      const delay = Math.min(
        RETRY_DELAY_BASE * 2 ** (attempt - 1),
        RETRY_DELAY_MAX,
      );
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }

  throw lastError ?? new NetworkError("Request failed after retries", 0);
};
