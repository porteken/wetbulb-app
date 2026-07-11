import fs from "node:fs/promises";
import path from "node:path";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

import { getRuntimeMockTableRows } from "./runtime-mocks";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer | undefined;

export async function startTestPostgres() {
  console.warn("Starting PostgreSQL Testcontainer...");
  return new PostgreSqlContainer("postgres:16-alpine").start();
}

export async function seedTestPostgres(
  postgresContainer: StartedPostgreSqlContainer,
) {
  const client = new Client({
    connectionString: `${postgresContainer.getConnectionUri()}?sslmode=disable`,
  });
  await client.connect();

  console.warn("Applying schema and seeding data...");

  // 1. Create tables
  const createTablesSql = await fs.readFile(
    path.join(import.meta.dirname, "db/schema/create_tables.sql"),
    "utf8",
  );
  await client.query(createTablesSql);

  // 2. Seed locations
  const locations = getRuntimeMockTableRows("locations") as any[];
  if (locations.length > 0) {
    const locationValues = locations
      .map(
        (loc) =>
          `(${loc.id}, '${loc.city.replaceAll("'", "''")}', '${loc.state.replaceAll("'", "''")}', ${loc.lat}, ${loc.lng})`,
      )
      .join(", ");
    await client.query(
      `INSERT INTO locations (id, city, state, lat, lng) VALUES ${locationValues};`,
    );
  }

  // 3. Seed wetbulb data
  const wetbulbs = getRuntimeMockTableRows("wetbulb") as any[];
  if (wetbulbs.length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < wetbulbs.length; i += chunkSize) {
      const chunk = wetbulbs.slice(i, i + chunkSize);
      const wetbulbValues = chunk
        .map((p) => `(${p.location_id}, '${p.date}', ${p.wetbulb})`)
        .join(", ");
      await client.query(
        `INSERT INTO wetbulb (location_id, date, wetbulb) VALUES ${wetbulbValues};`,
      );
    }
  }

  // 4. Create views (this will compute materialized views from the seeded data)
  const createViewsSql = await fs.readFile(
    path.join(import.meta.dirname, "db/schema/create_views.sql"),
    "utf8",
  );
  await client.query(createViewsSql);

  await client.end();
}

export function applyPostgresEnv(
  postgresContainer: StartedPostgreSqlContainer,
) {
  // Set environment variables for Vitest workers
  process.env.PGDATABASE = postgresContainer.getDatabase();
  process.env.PGHOST = postgresContainer.getHost();
  process.env.PGPASSWORD = postgresContainer.getPassword();
  process.env.PGPORT = postgresContainer.getPort().toString();
  process.env.PGUSER = postgresContainer.getUsername();
  process.env.PGSSLMODE = "disable";

  // Default E2E flags when the caller has not already selected a mode.
  process.env.NEXT_PUBLIC_E2E_TEST ??= "false";
  process.env.E2E_USE_RUNTIME_MOCKS ??= "false";

  console.warn("PostgreSQL Testcontainer ready on port", process.env.PGPORT);
}

export async function stopTestPostgres(
  postgresContainer: StartedPostgreSqlContainer | undefined,
) {
  if (postgresContainer) {
    console.warn("Stopping PostgreSQL Testcontainer...");
    await postgresContainer.stop();
  }
}

export async function setup() {
  container = await startTestPostgres();
  await seedTestPostgres(container);
  applyPostgresEnv(container);
}
