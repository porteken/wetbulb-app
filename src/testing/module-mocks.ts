import { vi } from "vitest";

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
