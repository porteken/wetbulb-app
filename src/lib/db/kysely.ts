import { getServerDatabaseEnvironment } from "@/config/environment";
import * as Sentry from "@sentry/nextjs";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { Database } from "./types";
import type { ServerDatabaseEnvironment } from "@/config/environment";

const DB_RETRY_ATTEMPTS = 3;
const DB_RETRY_BASE_DELAY_MS = 200;

// Codes for connection-level failures (restarts, network blips, exhausted
// pools) that are worth retrying. Query errors (bad SQL, missing columns,
// constraint violations) are not transient and should fail immediately.
const TRANSIENT_DB_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "57P01", // admin_shutdown
  "53300", // too_many_connections
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08006", // connection_failure
]);

export const isTransientDbError = (error: unknown): boolean => {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const { code } = error;
  return typeof code === "string" && TRANSIENT_DB_ERROR_CODES.has(code);
};

export const withDbRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < DB_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < DB_RETRY_ATTEMPTS - 1 && isTransientDbError(error)) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, DB_RETRY_BASE_DELAY_MS * 2 ** attempt);
        });
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

const dbSingletonKey = "wetbulbAppDbSingleton";
const pgPoolSingletonKey = "wetbulbAppPgPoolSingleton";

type WetbulbAppGlobal = typeof globalThis & {
  [dbSingletonKey]?: Kysely<Database>;
  [pgPoolSingletonKey]?: Pool;
};

const resolveSslConfiguration = (
  sslMode: ServerDatabaseEnvironment["PGSSLMODE"],
) => {
  if (sslMode === "disable") {
    return false;
  }

  return {
    rejectUnauthorized: sslMode === "verify-ca" || sslMode === "verify-full",
  };
};

const createPool = () => {
  const environment = getServerDatabaseEnvironment();

  const pool = new Pool({
    connectionTimeoutMillis: 5000,
    database: environment.PGDATABASE,
    host: environment.PGHOST,
    idleTimeoutMillis: 30_000,
    max: process.env.NODE_ENV === "test" ? 1 : 10,
    password: environment.PGPASSWORD,
    port: environment.PGPORT,
    ssl: resolveSslConfiguration(environment.PGSSLMODE),
    user: environment.PGUSER,
  });

  // pg emits 'error' when an idle client dies (DB restart, network blip); an
  // unhandled emitter error would otherwise crash the standalone Node server.
  pool.on("error", (error: unknown) => {
    console.error("Postgres pool idle client error", error);
    Sentry.captureException(error);
  });

  return pool;
};

export const getDb = (): Kysely<Database> => {
  const wetbulbAppGlobal = globalThis as WetbulbAppGlobal;

  if (wetbulbAppGlobal[dbSingletonKey]) {
    return wetbulbAppGlobal[dbSingletonKey];
  }

  const pool = wetbulbAppGlobal[pgPoolSingletonKey] ?? createPool();
  wetbulbAppGlobal[pgPoolSingletonKey] = pool;
  wetbulbAppGlobal[dbSingletonKey] = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool,
    }),
  });

  return wetbulbAppGlobal[dbSingletonKey];
};
