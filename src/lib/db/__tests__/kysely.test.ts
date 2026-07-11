import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerDatabaseEnvironment } from "@/config/environment";

interface MockConstructedClient<TKind extends string> {
  configuration: Record<string, unknown>;
  kind: TKind;
}

interface MockPoolClient extends MockConstructedClient<"pool"> {
  on: ReturnType<typeof vi.fn>;
}

interface LoadKyselyModuleOptions {
  nodeEnv?: string;
  sslMode?: ServerDatabaseEnvironment["PGSSLMODE"];
}

const createMockConstructor = <TKind extends string>(kind: TKind) =>
  function MockConstructor(
    configuration: Record<string, unknown>,
  ): MockConstructedClient<TKind> {
    return {
      configuration,
      kind,
    };
  };

function MockPoolConstructor(
  configuration: Record<string, unknown>,
): MockPoolClient {
  return {
    configuration,
    kind: "pool",
    on: vi.fn<(event: string, listener: (error: unknown) => void) => void>(),
  };
}

const resetDbGlobals = () => {
  globalThis.wetbulbAppDbSingleton = undefined;
  globalThis.wetbulbAppPgPoolSingleton = undefined;
};

const loadKyselyModule = async ({
  nodeEnv = "development",
  sslMode = "require",
}: LoadKyselyModuleOptions = {}) => {
  vi.stubEnv("NODE_ENV", nodeEnv);

  const poolMock =
    vi.fn<(configuration: Record<string, unknown>) => MockPoolClient>(
      MockPoolConstructor,
    );
  const postgresDialectMock = vi.fn<
    (configuration: Record<string, unknown>) => MockConstructedClient<"dialect">
  >(createMockConstructor("dialect"));
  const kyselyMock = vi.fn<
    (configuration: Record<string, unknown>) => MockConstructedClient<"db">
  >(createMockConstructor("db"));

  vi.doMock("@/config/environment", () => ({
    getServerDatabaseEnvironment: () => ({
      PGDATABASE: "wetbulb",
      PGHOST: "db.example.test",
      PGPASSWORD: "postgres",
      PGPORT: 5432,
      PGSSLMODE: sslMode,
      PGUSER: "copilot",
    }),
  }));
  vi.doMock("kysely", () => ({
    Kysely: kyselyMock,
    PostgresDialect: postgresDialectMock,
  }));
  vi.doMock("pg", () => ({
    Pool: poolMock,
  }));

  const captureExceptionMock = vi.fn<(error: unknown) => void>();
  vi.doMock("@sentry/nextjs", () => ({
    captureException: captureExceptionMock,
  }));

  const kyselyModule = await import("../kysely");

  return {
    captureExceptionMock,
    kyselyModule,
    kyselyMock,
    poolMock,
    postgresDialectMock,
  };
};

describe("getDb", () => {
  beforeEach(() => {
    resetDbGlobals();
    vi.resetModules();
  });

  afterEach(() => {
    resetDbGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("creates and caches a database client with ssl disabled in test mode", async () => {
    const { kyselyMock, kyselyModule, poolMock, postgresDialectMock } =
      await loadKyselyModule({ nodeEnv: "test", sslMode: "disable" });

    const firstDb = kyselyModule.getDb();
    const secondDb = kyselyModule.getDb();

    expect(secondDb).toBe(firstDb);
    expect(poolMock).toHaveBeenCalledTimes(1);
    expect(poolMock).toHaveBeenCalledWith({
      connectionTimeoutMillis: 5000,
      database: "wetbulb",
      host: "db.example.test",
      idleTimeoutMillis: 30_000,
      max: 1,
      password: "postgres",
      port: 5432,
      ssl: false,
      user: "copilot",
    });

    const pool = poolMock.mock.results[0]?.value;
    const dialect = postgresDialectMock.mock.results[0]?.value;

    expect(globalThis.wetbulbAppPgPoolSingleton).toBe(pool);
    expect(globalThis.wetbulbAppDbSingleton).toBe(firstDb);
    expect(postgresDialectMock).toHaveBeenCalledWith({ pool });
    expect(kyselyMock).toHaveBeenCalledWith({ dialect });
  });

  it("registers a pool error handler that reports to Sentry", async () => {
    const { captureExceptionMock, kyselyModule, poolMock } =
      await loadKyselyModule({ nodeEnv: "test", sslMode: "disable" });

    kyselyModule.getDb();

    const pool = poolMock.mock.results[0]?.value;
    expect(pool?.on).toHaveBeenCalledWith("error", expect.any(Function));

    const errorHandler = pool?.on.mock.calls[0]?.[1] as (
      error: unknown,
    ) => void;
    const idleClientError = new Error("connection terminated unexpectedly");
    errorHandler(idleClientError);

    expect(captureExceptionMock).toHaveBeenCalledWith(idleClientError);
  });

  it("uses strict ssl verification for verify-full mode", async () => {
    const { poolMock } = await loadKyselyModule({ sslMode: "verify-full" });

    await import("../kysely").then((module) => module.getDb());

    expect(poolMock).toHaveBeenCalledWith(
      expect.objectContaining({
        max: 10,
        ssl: { rejectUnauthorized: true },
      }),
    );
  });

  it("uses relaxed ssl for non-strict modes", async () => {
    const { poolMock } = await loadKyselyModule({ sslMode: "require" });

    await import("../kysely").then((module) => module.getDb());

    expect(poolMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: { rejectUnauthorized: false },
      }),
    );
  });

  it("reuses an existing pool singleton", async () => {
    const existingPool = { existing: true };
    globalThis.wetbulbAppPgPoolSingleton = existingPool as never;

    const { kyselyModule, poolMock, postgresDialectMock } =
      await loadKyselyModule();

    const db = kyselyModule.getDb();

    expect(db).toBe(globalThis.wetbulbAppDbSingleton);
    expect(poolMock).not.toHaveBeenCalled();
    expect(postgresDialectMock).toHaveBeenCalledWith({ pool: existingPool });
  });

  it("returns an existing database singleton without rebuilding clients", async () => {
    const existingDb = { existing: true };
    globalThis.wetbulbAppDbSingleton = existingDb as never;

    const { kyselyMock, kyselyModule, poolMock, postgresDialectMock } =
      await loadKyselyModule();

    expect(kyselyModule.getDb()).toBe(existingDb);
    expect(poolMock).not.toHaveBeenCalled();
    expect(postgresDialectMock).not.toHaveBeenCalled();
    expect(kyselyMock).not.toHaveBeenCalled();
  });
});

describe("isTransientDbError", () => {
  it("treats connection-level error codes as transient", async () => {
    const { isTransientDbError } = await import("../kysely");

    expect(isTransientDbError({ code: "ECONNRESET" })).toBe(true);
    expect(isTransientDbError({ code: "57P01" })).toBe(true);
  });

  it("treats query-level errors and non-error values as non-transient", async () => {
    const { isTransientDbError } = await import("../kysely");

    expect(isTransientDbError({ code: "42703" })).toBe(false);
    expect(isTransientDbError(new Error("boom"))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
  });
});

describe("withDbRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries transient failures with backoff and eventually succeeds", async () => {
    const { withDbRetry } = await import("../kysely");

    const transientError = Object.assign(new Error("connection reset"), {
      code: "ECONNRESET",
    });
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce("ok");

    const resultPromise = withDbRetry(fn);
    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately without retrying non-transient errors", async () => {
    const { withDbRetry } = await import("../kysely");

    const queryError = Object.assign(new Error("missing column"), {
      code: "42703",
    });
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(queryError);

    await expect(withDbRetry(fn)).rejects.toBe(queryError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting retry attempts on transient errors", async () => {
    const { withDbRetry } = await import("../kysely");

    const transientError = Object.assign(new Error("timed out"), {
      code: "ETIMEDOUT",
    });
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(transientError);

    let caughtError: unknown;
    const drive = async () => {
      try {
        await withDbRetry(fn);
      } catch (error) {
        caughtError = error;
      }
    };

    const donePromise = drive();
    await vi.runAllTimersAsync();
    await donePromise;

    expect(caughtError).toBe(transientError);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
