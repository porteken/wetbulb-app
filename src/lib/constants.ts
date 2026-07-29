export const APP_CONFIG = {
  GITHUB_URL: "https://github.com/porteken/wetbulb-app",
  NAME: "Historical Wetbulb App",
  WETBULB_EXERCISE_SAFETY_URL:
    "https://www.princetonmedicine.com/blog/wet-bulb-temperature-and-exercise-safety-what-you-need-to-know",
  WETBULB_LIMIT_URL:
    "https://www.psu.edu/news/research/story/humans-cant-endure-temperatures-and-humidities-high-previously-thought",
  WETBULB_LOW_RISK_URL:
    "https://escholarship.org/content/qt2xz601d0/qt2xz601d0.pdf",
} as const;

export const TEMPERATURE_UNIT_COOKIE_NAME = "temperature-unit" as const;
const TEMPERATURE_UNITS = ["F", "C"] as const;
export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];
export const DEFAULT_TEMPERATURE_UNIT: TemperatureUnit = "F";

const isTemperatureUnit = (value: string): value is TemperatureUnit =>
  (TEMPERATURE_UNITS as readonly string[]).includes(value);

export const normalizeTemperatureUnit = (
  value: string | undefined,
): TemperatureUnit => {
  if (value && isTemperatureUnit(value)) {
    return value;
  }

  return DEFAULT_TEMPERATURE_UNIT;
};

export const WETBULB_BASIS_COOKIE_NAME = "wetbulb-basis" as const;
const WETBULB_BASES = ["max", "avg"] as const;
export type WetbulbBasis = (typeof WETBULB_BASES)[number];
export const DEFAULT_WETBULB_BASIS: WetbulbBasis = "max";

const FORECAST_SCENARIOS = ["ssp126", "ssp245", "ssp370"] as const;
export type ForecastScenario = (typeof FORECAST_SCENARIOS)[number];
export const DEFAULT_FORECAST_SCENARIO: ForecastScenario = "ssp245";
export const isForecastScenario = (value: string): value is ForecastScenario =>
  (FORECAST_SCENARIOS as readonly string[]).includes(value);

const isWetbulbBasis = (value: string): value is WetbulbBasis =>
  (WETBULB_BASES as readonly string[]).includes(value);

export const normalizeWetbulbBasis = (
  value: string | undefined,
): WetbulbBasis => {
  if (value && isWetbulbBasis(value)) {
    return value;
  }

  return DEFAULT_WETBULB_BASIS;
};

export const DATA_REGION_COOKIE_NAME = "data-region" as const;
const DATA_REGIONS = ["na", "eu"] as const;
export type DataRegion = (typeof DATA_REGIONS)[number];
export const DEFAULT_DATA_REGION: DataRegion = "na";

export const EU_LOCATION_ID_MIN = 1000;

const isDataRegion = (value: string): value is DataRegion =>
  (DATA_REGIONS as readonly string[]).includes(value);

export const normalizeDataRegion = (value: string | undefined): DataRegion => {
  if (value && isDataRegion(value)) {
    return value;
  }

  return DEFAULT_DATA_REGION;
};

export const regionForLocationId = (locationId: number): DataRegion =>
  locationId >= EU_LOCATION_ID_MIN ? "eu" : "na";

export const DATA_REGION_LABELS = {
  eu: {
    name: "Europe",
    short: "Europe",
    subdivision: "Country",
    subdivisionPlaceholder: "All countries",
  },
  na: {
    name: "North America",
    short: "N. America",
    subdivision: "State/Province",
    subdivisionPlaceholder: "All states/provinces",
  },
} as const satisfies Record<
  DataRegion,
  {
    name: string;
    short: string;
    subdivision: string;
    subdivisionPlaceholder: string;
  }
>;

export const GRAPH_MEASURE_COOKIE_NAME = "graph-measure" as const;
export const GRAPH_SEASON_COOKIE_NAME = "graph-season" as const;
export const REFERENCE_YEAR_COOKIE_NAME = "reference-year" as const;
export const RANKINGS_WETBULB_LEVEL_COOKIE_NAME =
  "rankings-wetbulb-level" as const;
export const RANKINGS_SEASON_COOKIE_NAME = "rankings-season" as const;
export const RANKINGS_STATE_COOKIE_NAME = "rankings-state" as const;
export const RANKINGS_YEAR_COOKIE_NAME = "rankings-year" as const;
export const FORECAST_ENABLED_COOKIE_NAME = "forecast-enabled" as const;
export const FORECAST_YEARS_AHEAD_COOKIE_NAME = "forecast-years-ahead" as const;
export const DEFAULT_GRAPH_MEASURE = "avg" as const;
export const GRAPH_SEASONS = [
  "Annual",
  "Spring",
  "Summer",
  "Fall",
  "Winter",
] as const;
export type GraphSeason = (typeof GRAPH_SEASONS)[number];
export const DEFAULT_GRAPH_SEASON = "Annual" as const;
export const DEFAULT_REFERENCE_YEAR = "2000" as const;
export const DEFAULT_FORECAST_ENABLED = false as const;
const DEFAULT_FORECAST_YEARS = 10;
const MIN_FORECAST_YEARS = 5;
const MAX_FORECAST_YEARS = 75;

export const DEFAULT_FORECAST_YEARS_AHEAD = DEFAULT_FORECAST_YEARS;
export const MIN_FORECAST_YEARS_AHEAD = MIN_FORECAST_YEARS;
export const MAX_FORECAST_YEARS_AHEAD = MAX_FORECAST_YEARS;

export const PREFERENCE_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const isGraphSeason = (value: string): value is GraphSeason =>
  (GRAPH_SEASONS as readonly string[]).includes(value);

export const normalizeGraphSeason = (
  value: string | undefined,
): GraphSeason => {
  if (value && isGraphSeason(value)) {
    return value;
  }

  return DEFAULT_GRAPH_SEASON;
};

export const ERROR_MESSAGES = {
  DATABASE_CONNECTION:
    "Unable to connect to the database. Please try again later.",
  NO_DATA: "No location data available",
  NO_DATA_UI:
    "Unable to load location data. The database may be temporarily unavailable.",
} as const;

export const ERROR_TITLES = {
  DATABASE_CONNECTION: "Database Connection Error",
  NO_DATA: "No Data Available",
} as const;

export const GRAPH_CONFIG = {
  COLORS: {
    PRIMARY: "#1f77b4",
    REFERENCE: "#2ca02c",
    SECONDARY: "#ff7f0e",
  },
  LAYOUT: {
    HEIGHT: 400,
    MARGIN: { b: 40, l: 60, r: 20, t: 20 },
  },
  TREND_OPTIONS: {
    AVG: "avg",
    MAX: "max",
  },
  YEAR_RANGE: {
    END: 2026,
    START: 2000,
  },
} as const;

export const GRAPH_COLORS = {
  background: "var(--graph-surface)",
  confidenceFill: "var(--graph-confidence-fill)",
  grid: "var(--graph-grid)",
  primary: "var(--graph-primary)",
  reference: "var(--graph-reference)",
  secondary: "var(--graph-secondary)",
  text: "var(--graph-text)",
  tooltipBackground: "var(--graph-tooltip-background)",
  tooltipBorder: "var(--graph-tooltip-border)",
} as const;
