import * as environment from "@/config/environment";
import { DatabaseError } from "@/lib/utils/errors";
import {
  createDbError,
  createFakeQuery,
  type FakeQuery,
} from "@/testing/db-query-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchCityRankingsRows,
  fetchReferenceGraphRows,
  fetchTrendGraphRows,
} from "../queries";

import type * as KyselyModule from "../kysely";

vi.mock("../kysely", async (importOriginal) => {
  const actual = await importOriginal<typeof KyselyModule>();
  return {
    ...actual,
    getDb: vi.fn<typeof KyselyModule.getDb>(),
  };
});

const { getDb } = await import("../kysely");
const mockedGetDb = vi.mocked(getDb);

const mockSelectFromQueue = (executes: Array<() => Promise<unknown>>) => {
  const queries = executes.map((execute) => createFakeQuery(execute));
  const selectFrom = vi.fn<(table: string) => FakeQuery>();
  for (const query of queries) {
    selectFrom.mockReturnValueOnce(query);
  }
  mockedGetDb.mockReturnValue({
    selectFrom,
  } as unknown as ReturnType<typeof getDb>);

  return queries;
};

const missingColumnError = (relation: string, column: string) =>
  createDbError(
    "42703",
    `column "${column}" of relation "${relation}" does not exist`,
  );

describe("fetchCityRankingsRows retry and fallback behavior", () => {
  beforeEach(() => {
    vi.spyOn(environment, "shouldUseRuntimeDbMocks").mockReturnValue(false);
  });

  describe("max basis", () => {
    it("fetches rankings for a season successfully", async () => {
      const rows = [{ city: "Phoenix" }];
      mockSelectFromQueue([async () => rows]);

      const result = await fetchCityRankingsRows(2024, "Summer", "max");

      expect(result).toBe(rows);
    });

    it("retries without a season filter when the season column is missing", async () => {
      const rows = [{ city: "Phoenix" }];
      mockSelectFromQueue([
        async () => {
          throw missingColumnError("wetbulb_city_rankings_view", "season");
        },
        async () => rows,
      ]);

      const result = await fetchCityRankingsRows(2024, "Summer", "max");

      expect(result).toBe(rows);
    });

    it("throws a classified database error for unrecoverable failures", async () => {
      mockSelectFromQueue([
        async () => {
          throw createDbError("XX000", "connection terminated unexpectedly");
        },
      ]);

      await expect(
        fetchCityRankingsRows(2024, "Summer", "max"),
      ).rejects.toBeInstanceOf(DatabaseError);
    });
  });

  describe("avg basis", () => {
    it("fetches rankings successfully", async () => {
      const rows = [{ city: "Phoenix" }];
      mockSelectFromQueue([async () => rows]);

      const result = await fetchCityRankingsRows(2024, "Summer", "avg");

      expect(result).toBe(rows);
    });

    it("retries without a season filter when the season column is missing", async () => {
      const rows = [{ city: "Phoenix" }];
      mockSelectFromQueue([
        async () => {
          throw missingColumnError("wetbulb_city_rankings_view", "season");
        },
        async () => rows,
      ]);

      const result = await fetchCityRankingsRows(2024, "Summer", "avg");

      expect(result).toBe(rows);
    });

    it("falls back to the legacy mixed select when the avg columns are missing", async () => {
      const rows = [{ city: "Phoenix" }];
      mockSelectFromQueue([
        async () => {
          throw missingColumnError(
            "wetbulb_city_rankings_view",
            "max_wetbulb_avg",
          );
        },
        async () => rows,
      ]);

      const result = await fetchCityRankingsRows(2024, "Summer", "avg");

      expect(result).toBe(rows);
    });

    it("falls back to the legacy mixed select without season when both avg columns and season are missing", async () => {
      const rows = [{ city: "Phoenix" }];
      mockSelectFromQueue([
        async () => {
          throw missingColumnError(
            "wetbulb_city_rankings_view",
            "max_wetbulb_avg",
          );
        },
        async () => {
          throw missingColumnError("wetbulb_city_rankings_view", "season");
        },
        async () => rows,
      ]);

      const result = await fetchCityRankingsRows(2024, "Summer", "avg");

      expect(result).toBe(rows);
    });

    it("falls back to non-avg bounds when avg columns and p5/p95 are both missing", async () => {
      const rows = [{ city: "Phoenix" }];
      mockSelectFromQueue([
        async () => {
          throw missingColumnError(
            "wetbulb_city_rankings_view",
            "max_wetbulb_avg",
          );
        },
        async () => {
          throw missingColumnError("wetbulb_city_rankings_view", "p5_avg");
        },
        async () => rows,
      ]);

      const result = await fetchCityRankingsRows(2024, "Summer", "avg");

      expect(result).toBe(rows);
    });

    it("throws a classified database error when the legacy fallback is unrecoverable", async () => {
      mockSelectFromQueue([
        async () => {
          throw missingColumnError(
            "wetbulb_city_rankings_view",
            "max_wetbulb_avg",
          );
        },
        async () => {
          throw createDbError("XX000", "connection terminated unexpectedly");
        },
      ]);

      await expect(
        fetchCityRankingsRows(2024, "Summer", "avg"),
      ).rejects.toBeInstanceOf(DatabaseError);
    });

    it("falls back to non-avg bounds columns when p5/p95 are missing", async () => {
      const rows = [{ city: "Phoenix" }];
      mockSelectFromQueue([
        async () => {
          throw missingColumnError("wetbulb_city_rankings_view", "p5_avg");
        },
        async () => rows,
      ]);

      const result = await fetchCityRankingsRows(2024, "Summer", "avg");

      expect(result).toBe(rows);
    });

    it("throws a classified database error for unrecoverable failures", async () => {
      mockSelectFromQueue([
        async () => {
          throw createDbError("XX000", "connection terminated unexpectedly");
        },
      ]);

      await expect(
        fetchCityRankingsRows(2024, "Summer", "avg"),
      ).rejects.toBeInstanceOf(DatabaseError);
    });
  });
});

describe("fetchTrendGraphRows and fetchReferenceGraphRows query building", () => {
  beforeEach(() => {
    vi.spyOn(environment, "shouldUseRuntimeDbMocks").mockReturnValue(false);
  });

  it("builds and executes the trend graph query", async () => {
    const rows = [{ location_id: 1, wetbulb: 20, year: 2020 }];
    mockSelectFromQueue([async () => rows]);

    const result = await fetchTrendGraphRows(1, "avg", "Annual", "max");

    expect(result).toBe(rows);
  });

  it("builds and executes the reference graph query", async () => {
    const rows = [{ date: "2020-01-01", location_id: 1, wetbulb: 20 }];
    mockSelectFromQueue([async () => rows]);

    const result = await fetchReferenceGraphRows(1, "2020");

    expect(result).toBe(rows);
  });
});
