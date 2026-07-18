import * as environment from "@/config/environment";
import { DatabaseError } from "@/lib/utils/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchForecastRows } from "../queries";

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

const queryWindow = { lastHistoricalYear: 2020, targetYear: 2030 };

const createDbError = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

interface ForecastRow {
  lower: number;
  upper: number;
  wetbulb: number;
  year: number;
}

interface FakeQuery {
  execute: () => Promise<unknown>;
  orderBy: (...args: unknown[]) => FakeQuery;
  select: (...args: unknown[]) => FakeQuery;
  where: (...args: unknown[]) => FakeQuery;
}

const createFakeQuery = (execute: () => Promise<unknown>): FakeQuery => {
  const select = vi.fn<(...args: unknown[]) => FakeQuery>();
  const orderBy = vi.fn<(...args: unknown[]) => FakeQuery>();
  const where = vi.fn<(...args: unknown[]) => FakeQuery>();
  const query: FakeQuery = { execute, orderBy, select, where };
  select.mockReturnValue(query);
  where.mockReturnValue(query);
  orderBy.mockReturnValue(query);
  return query;
};

describe("fetchForecastRows retry and fallback behavior", () => {
  beforeEach(() => {
    vi.spyOn(environment, "shouldUseRuntimeDbMocks").mockReturnValue(false);
  });

  it("queries the scenario materialized view when a scenario is selected", async () => {
    const execute = vi.fn<() => Promise<ForecastRow[]>>().mockResolvedValue([]);
    const fakeQuery = createFakeQuery(execute);
    const selectFrom = vi
      .fn<(table: string) => FakeQuery>()
      .mockReturnValue(fakeQuery);
    mockedGetDb.mockReturnValue({ selectFrom } as unknown as ReturnType<
      typeof getDb
    >);

    await fetchForecastRows(1, queryWindow, {
      basis: "max",
      scenario: "ssp126",
    });

    expect(selectFrom).toHaveBeenCalledWith("wetbulb_forecast_scenarios");
    expect(fakeQuery.where).toHaveBeenCalledWith("scenario", "=", "ssp126");
  });

  it("retries without a season filter when the season column is missing", async () => {
    const rows: ForecastRow[] = [
      { lower: 1, upper: 3, wetbulb: 2, year: 2021 },
    ];
    const execute = vi
      .fn<() => Promise<ForecastRow[]>>()
      .mockRejectedValueOnce(
        createDbError(
          "42703",
          'column "season" of relation "wetbulb_forecast" does not exist',
        ),
      )
      .mockResolvedValueOnce(rows);
    const fakeQuery = createFakeQuery(execute);
    mockedGetDb.mockReturnValue({
      selectFrom: vi
        .fn<(table: string) => FakeQuery>()
        .mockReturnValue(fakeQuery),
    } as unknown as ReturnType<typeof getDb>);

    const result = await fetchForecastRows(1, queryWindow, {
      basis: "avg",
      season: "Summer",
    });

    expect(result).toBe(rows);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("falls back to the plain wetbulb columns when the avg columns are missing", async () => {
    const rows: ForecastRow[] = [
      { lower: 1, upper: 3, wetbulb: 2, year: 2021 },
    ];
    const execute = vi
      .fn<() => Promise<ForecastRow[]>>()
      .mockRejectedValueOnce(
        createDbError(
          "42703",
          'column "wetbulb_avg" of relation "wetbulb_forecast" does not exist',
        ),
      )
      .mockResolvedValueOnce(rows);
    const fakeQuery = createFakeQuery(execute);
    const selectFrom = vi
      .fn<(table: string) => FakeQuery>()
      .mockReturnValue(fakeQuery);
    mockedGetDb.mockReturnValue({
      selectFrom,
    } as unknown as ReturnType<typeof getDb>);

    const result = await fetchForecastRows(1, queryWindow, { basis: "avg" });

    expect(result).toBe(rows);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(fakeQuery.select).toHaveBeenNthCalledWith(1, [
      "year",
      "wetbulb_avg as wetbulb",
      "lower_avg as lower",
      "upper_avg as upper",
    ]);
    expect(fakeQuery.select).toHaveBeenNthCalledWith(2, [
      "year",
      "wetbulb",
      "lower",
      "upper",
    ]);
  });

  it("throws a classified database error for unrecoverable query failures", async () => {
    const execute = vi
      .fn<() => Promise<never>>()
      .mockRejectedValue(
        createDbError("XX000", "connection terminated unexpectedly"),
      );
    const fakeQuery = createFakeQuery(execute);
    mockedGetDb.mockReturnValue({
      selectFrom: vi
        .fn<(table: string) => FakeQuery>()
        .mockReturnValue(fakeQuery),
    } as unknown as ReturnType<typeof getDb>);

    await expect(
      fetchForecastRows(1, queryWindow, { basis: "max" }),
    ).rejects.toBeInstanceOf(DatabaseError);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
