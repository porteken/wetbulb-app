import { vi } from "vitest";

import {
  createMockCookieStore,
  createMockLinearRegression,
  createMockValidation,
  setupSuccessfulValidations,
} from "./mocks";

import type { SimpleLinearRegression } from "@/lib/utils/simple-linear-regression";
import type { cookies as cookiesFunction } from "next/headers";

vi.mock("next/headers", () => ({
  cookies: mockFn(),
}));

vi.mock("next/cache", () =>
  Object.fromEntries([
    [
      "unstable_cache",
      <TFunction extends (...arguments_: any[]) => any>(function_: TFunction) =>
        function_,
    ],
  ]),
);

vi.mock("@/lib/utils/simple-linear-regression", () => ({
  SimpleLinearRegression: mockFn(),
}));

vi.mock("@/lib/db/queries", () => ({
  fetchCityRankingsRows: mockFn(),
  fetchForecastRows: mockFn(),
  fetchHistoricalYearRow: mockFn(),
  fetchLocationRows: mockFn(),
  fetchReferenceGraphRows: mockFn(),
  fetchTrendGraphRows: mockFn(),
}));

vi.mock("@/lib/utils/validation", () => ({
  validateDates: mockFn(),
  validateLocationId: mockFn(),
  validateWetbulbs: mockFn(),
  validateTrendOption: mockFn(),
  validateYear: mockFn(),
  validateYearWetbulbs: mockFn(),
  validateYears: mockFn(),
}));

export const setupApiClientTest = async () => {
  const mockValidation = createMockValidation();

  const validation = await import("@/lib/utils/validation");
  Object.assign(validation, mockValidation);

  setupSuccessfulValidations(mockValidation);

  return { mockValidation };
};

export const setupApiServerTest = async () => {
  const mockCookieStore = createMockCookieStore();
  const mockLinearRegression = createMockLinearRegression();
  const mockValidation = createMockValidation();

  const { cookies } = await import("next/headers");
  vi.mocked(cookies).mockResolvedValue(
    mockCookieStore as unknown as Awaited<ReturnType<typeof cookiesFunction>>,
  );

  const dbQueries = await import("@/lib/db/queries");

  const { SimpleLinearRegression } =
    await import("@/lib/utils/simple-linear-regression");
  vi.mocked(SimpleLinearRegression).mockImplementation(
    function MockSimpleLinearRegression(
      this: SimpleLinearRegression,
      _x: number[],
      _y: number[],
    ) {
      Object.assign(this, mockLinearRegression);
    },
  );

  const validation = await import("@/lib/utils/validation");
  Object.assign(validation, mockValidation);
  setupSuccessfulValidations(mockValidation);

  return {
    mockCookieStore,
    mockDbQueries: {
      fetchCityRankingsRows: vi.mocked(dbQueries.fetchCityRankingsRows),
      fetchForecastRows: vi.mocked(dbQueries.fetchForecastRows),
      fetchHistoricalYearRow: vi.mocked(dbQueries.fetchHistoricalYearRow),
      fetchLocationRows: vi.mocked(dbQueries.fetchLocationRows),
      fetchReferenceGraphRows: vi.mocked(dbQueries.fetchReferenceGraphRows),
      fetchTrendGraphRows: vi.mocked(dbQueries.fetchTrendGraphRows),
    },
    mockLinearRegression,
    mockValidation,
  };
};

export const clearAllMocks = () => {
  vi.clearAllMocks();
};
