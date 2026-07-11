import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadInstrumentationModule = async ({
  e2eTestRun = "false",
  nextRuntime = "nodejs",
}: {
  e2eTestRun?: string;
  nextRuntime?: string;
} = {}) => {
  vi.stubEnv("NEXT_PUBLIC_E2E_TEST", e2eTestRun);
  vi.stubEnv("NEXT_RUNTIME", nextRuntime);

  vi.doMock("../../sentry.server.config", () => ({}));
  vi.doMock("../../sentry.edge.config", () => ({}));

  const getPublicEnvironment = vi.fn<() => void>();
  const getServerDatabaseEnvironment = vi.fn<() => void>();
  const shouldUseRuntimeDbMocks = vi.fn<() => boolean>().mockReturnValue(false);

  vi.doMock("@/config/environment", () => ({
    getPublicEnvironment,
    getServerDatabaseEnvironment,
    shouldUseRuntimeDbMocks,
  }));

  const instrumentationModule = await import("../instrumentation");

  return {
    getPublicEnvironment,
    getServerDatabaseEnvironment,
    instrumentationModule,
    shouldUseRuntimeDbMocks,
  };
};

describe("register", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("validates public and database environment variables at boot", async () => {
    const {
      getPublicEnvironment,
      getServerDatabaseEnvironment,
      instrumentationModule,
    } = await loadInstrumentationModule();

    await instrumentationModule.register();

    expect(getPublicEnvironment).toHaveBeenCalledTimes(1);
    expect(getServerDatabaseEnvironment).toHaveBeenCalledTimes(1);
  });

  it("skips database validation when runtime mocks are enabled", async () => {
    const {
      getPublicEnvironment,
      getServerDatabaseEnvironment,
      instrumentationModule,
      shouldUseRuntimeDbMocks,
    } = await loadInstrumentationModule();
    shouldUseRuntimeDbMocks.mockReturnValue(true);

    await instrumentationModule.register();

    expect(getPublicEnvironment).toHaveBeenCalledTimes(1);
    expect(getServerDatabaseEnvironment).not.toHaveBeenCalled();
  });

  it("skips validation entirely during e2e test runs", async () => {
    const {
      getPublicEnvironment,
      getServerDatabaseEnvironment,
      instrumentationModule,
    } = await loadInstrumentationModule({ e2eTestRun: "true" });

    await instrumentationModule.register();

    expect(getPublicEnvironment).not.toHaveBeenCalled();
    expect(getServerDatabaseEnvironment).not.toHaveBeenCalled();
  });

  it("skips validation on the edge runtime", async () => {
    const {
      getPublicEnvironment,
      getServerDatabaseEnvironment,
      instrumentationModule,
    } = await loadInstrumentationModule({ nextRuntime: "edge" });

    await instrumentationModule.register();

    expect(getPublicEnvironment).not.toHaveBeenCalled();
    expect(getServerDatabaseEnvironment).not.toHaveBeenCalled();
  });

  it("propagates environment validation failures so boot fails fast", async () => {
    const { getServerDatabaseEnvironment, instrumentationModule } =
      await loadInstrumentationModule();
    getServerDatabaseEnvironment.mockImplementation(() => {
      throw new Error("Invalid server environment variables: PGHOST: Required");
    });

    await expect(instrumentationModule.register()).rejects.toThrow(
      "Invalid server environment variables",
    );
  });
});
