import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

const DATA_RESPONSE_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";
const HTTP_SERVER_ERROR = 500;

const hasStatusCode = (
  error: unknown,
): error is {
  message: string;
  statusCode: number;
} =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string" &&
  "statusCode" in error &&
  typeof error.statusCode === "number";

export const createDataRouteErrorResponse = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (hasStatusCode(error)) {
    if (error.statusCode >= HTTP_SERVER_ERROR) {
      Sentry.captureException(
        error instanceof Error ? error : new Error(error.message),
      );
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof Error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  Sentry.captureException(new Error(fallbackMessage));
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
};

export const createCachedDataRouteResponse = (data: unknown) =>
  NextResponse.json(data, {
    headers: {
      "Cache-Control": DATA_RESPONSE_CACHE_CONTROL,
    },
  });
