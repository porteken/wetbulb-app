import { FetchError } from "@/lib/utils/errors";
import * as Sentry from "@sentry/nextjs";

export type ApiResponse<T> =
  | {
      data: T;
      error: undefined;
    }
  | {
      data: undefined;
      error: {
        code?: string;
        message: string;
        status?: number;
      };
    };

type ErrorHandler = (error: Error) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function apiRequest<T>(
  requestFunction: () => Promise<T>,
  errorHandler?: ErrorHandler,
): Promise<ApiResponse<T>> {
  try {
    const data = await requestFunction();

    return {
      data,
      error: undefined,
    };
  } catch (error) {
    const formattedError = handleApiError(error);

    if (errorHandler && error instanceof Error) {
      errorHandler(error);
    }

    return {
      data: undefined,
      error: formattedError,
    };
  }
}

export function hasError<T>(response: ApiResponse<T>): response is {
  data: undefined;
  error: {
    code?: string;
    message: string;
    status?: number;
  };
} {
  return response.error !== undefined;
}

export async function fetchApiJson(path: string): Promise<unknown> {
  const response = await fetch(path, {
    headers: {
      accept: "application/json",
    },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    if (
      payload !== null &&
      isRecord(payload) &&
      typeof payload.error === "string"
    ) {
      message = payload.error;
    }

    throw new FetchError(message, {
      payload,
      statusCode: response.status,
    });
  }

  return payload;
}

function handleApiError(error: unknown) {
  if (error instanceof Error) {
    Sentry.captureException(error, {
      tags: {
        errorSource: "API",
      },
    });
  }

  if (error instanceof FetchError) {
    return {
      code: "FETCH_ERROR",
      message: error.message,
      status: 500,
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message,
      status: 500,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred",
    status: 500,
  };
}
