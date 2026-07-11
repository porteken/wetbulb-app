import * as Sentry from "@sentry/nextjs";

const isE2ETestRun = process.env.NEXT_PUBLIC_E2E_TEST === "true";

export async function register() {
  if (isE2ETestRun) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    const {
      getPublicEnvironment,
      getServerDatabaseEnvironment,
      shouldUseRuntimeDbMocks,
    } = await import("@/config/environment");

    getPublicEnvironment();
    if (!shouldUseRuntimeDbMocks()) {
      getServerDatabaseEnvironment();
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (
  ...arguments_
) => {
  if (isE2ETestRun) {
    return;
  }

  Sentry.captureRequestError(...arguments_);
};
