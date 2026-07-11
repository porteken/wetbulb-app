import type { Database } from "./types";
import type { Kysely } from "kysely";
import type { Pool } from "pg";

declare global {
  var wetbulbAppDbSingleton: Kysely<Database> | undefined;
  var wetbulbAppPgPoolSingleton: Pool | undefined;
}
