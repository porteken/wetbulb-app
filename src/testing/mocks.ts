import { drop, factory, primaryKey } from "@mswjs/data";

let locationCounter = 1;
let wetbulbDataCounter = 1;
let wetbulbCountCounter = 1;
let trendDataCounter = 1;
let trendCountCounter = 1;

export const database = factory({
  location: {
    city: () => "Test City",
    lat: () => 40.7128,
    lng: () => -74.006,
    location_id: primaryKey(() => locationCounter++),
    state: () => "Test State",
  },
  wetbulbData: {
    date: () => new Date("2025-01-01"),
    id: primaryKey(() => wetbulbDataCounter++),
    location_id: () => 1,
    measure_type: () => "avg",
    wetbulb_count: () => ((wetbulbCountCounter++ - 1) % 100) + 1,
  },
  trendData: {
    id: primaryKey(() => trendDataCounter++),
    location_id: () => 1,
    measure_type: () => "avg",
    wetbulb_count: () => ((trendCountCounter++ - 1) % 100) + 1,
    year: () => 2025,
  },
});

export const resetDatabase = () => {
  locationCounter = 1;
  wetbulbDataCounter = 1;
  wetbulbCountCounter = 1;
  trendDataCounter = 1;
  trendCountCounter = 1;

  drop(database);
};

export const createMockCookieStore = () => ({
  get: mockFn(),
  set: mockFn(),
});

export const createMockLinearRegression = () => ({
  predict: mockFn(),
  slope: 0,
});
export const createMockValidation = () => ({
  validateDates: mockFn(),
  validateLocationId: mockFn(),
  validateWetbulbs: mockFn(),
  validateTrendOption: mockFn(),
  validateYear: mockFn(),
  validateYearWetbulbs: mockFn(),
  validateYears: mockFn(),
});

export const setupSuccessfulValidations = (
  mockValidation: ReturnType<typeof createMockValidation>,
) => {
  mockValidation.validateDates.mockImplementation(() => {});
  mockValidation.validateLocationId.mockReturnValue(true);
  mockValidation.validateWetbulbs.mockImplementation(() => {});
  mockValidation.validateTrendOption.mockReturnValue(true);
  mockValidation.validateYear.mockReturnValue(true);
  mockValidation.validateYearWetbulbs.mockReturnValue(true);
  mockValidation.validateYears.mockReturnValue(true);
};
