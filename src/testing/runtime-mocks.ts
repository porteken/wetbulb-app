import type {
  WetbulbCityRankingsViewTable,
  WetbulbForecastTable,
  WetbulbYearStatsTable,
} from "@/lib/db/types";

type Primitive = number | string;
type MockRow = Record<string, Primitive>;

interface RuntimeLocationRow extends MockRow {
  city: string;
  id: number;
  lat: number;
  lng: number;
  location_id: number;
  state: string;
}

interface RuntimeWetbulbChangeRow extends MockRow {
  change: number;
  location_id: number;
}

interface RuntimeWetbulbPercentilesRow extends MockRow {
  location_id: number;
  p10: number;
  p90: number;
  year: number;
}

interface RuntimeWetbulbRow extends MockRow {
  date: string;
  location_id: number;
  wetbulb: number;
  wetbulb_avg: number;
  year: number;
}

interface RuntimeMockTables {
  wetbulb_city_rankings_view: Array<WetbulbCityRankingsViewTable & MockRow>;
  locations: RuntimeLocationRow[];
  wetbulb: RuntimeWetbulbRow[];
  wetbulb_change: RuntimeWetbulbChangeRow[];
  wetbulb_forecast: Array<WetbulbForecastTable & MockRow>;
  wetbulb_forecast_max: Array<WetbulbForecastTable & MockRow>;
  wetbulb_percentiles: RuntimeWetbulbPercentilesRow[];
  wetbulb_year_stats: Array<WetbulbYearStatsTable & MockRow>;
}

const YEARS = Array.from({ length: 27 }, (_, index) => 2000 + index);
const FORECAST_YEARS = Array.from({ length: 75 }, (_, index) => 2026 + index);
const GRAPH_SEASONS = ["Annual", "Spring", "Summer", "Fall", "Winter"] as const;
const SEASONAL_AVG_OFFSETS = {
  Annual: 0,
  Fall: -0.44,
  Spring: -0.89,
  Summer: 2.5,
  Winter: -4.17,
} as const;
const SEASONAL_MAX_OFFSETS = {
  Annual: 2.5,
  Fall: 2,
  Spring: 1.28,
  Summer: 3.78,
  Winter: 0.78,
} as const;

const LOCATIONS = [
  {
    city: "Phoenix",
    lat: 33.4484,
    lng: -112.074,
    location_id: 1,
    state: "AZ",
    trendPerYear: 0.08,
    year2000Avg: 20.1,
  },
  {
    city: "Miami",
    lat: 25.7617,
    lng: -80.1918,
    location_id: 2,
    state: "FL",
    trendPerYear: 0.06,
    year2000Avg: 26,
  },
  {
    city: "Dallas",
    lat: 32.7767,
    lng: -96.797,
    location_id: 3,
    state: "TX",
    trendPerYear: 0.07,
    year2000Avg: 23.7,
  },
  {
    city: "Denver",
    lat: 39.7392,
    lng: -104.9903,
    location_id: 4,
    state: "CO",
    trendPerYear: 0.05,
    year2000Avg: 14.7,
  },
  {
    city: "Seattle",
    lat: 47.6062,
    lng: -122.3321,
    location_id: 5,
    state: "WA",
    trendPerYear: 0.04,
    year2000Avg: 13.8,
  },
  {
    city: "Minneapolis",
    lat: 44.9778,
    lng: -93.265,
    location_id: 6,
    state: "MN",
    trendPerYear: 0.04,
    year2000Avg: 16.7,
  },
  {
    city: "London",
    lat: 51.5085,
    lng: -0.1257,
    location_id: 1000,
    state: "United Kingdom",
    trendPerYear: 0.04,
    year2000Avg: 13.2,
  },
  {
    city: "Madrid",
    lat: 40.4165,
    lng: -3.7026,
    location_id: 1001,
    state: "Spain",
    trendPerYear: 0.06,
    year2000Avg: 15.9,
  },
  {
    city: "Athens",
    lat: 37.9795,
    lng: 23.7162,
    location_id: 1002,
    state: "Greece",
    trendPerYear: 0.07,
    year2000Avg: 19.4,
  },
] as const;

const round = (value: number) => Math.round(value * 100) / 100;

const AVG_BASIS_OFFSET = -1.5;

const getAverageWetbulb = (locationId: number, year: number) => {
  const location = LOCATIONS.find((item) => item.location_id === locationId);
  if (location === undefined) {
    throw new Error(`Unknown location id: ${locationId}`);
  }
  const delta = year - 2000;
  return round(location.year2000Avg + delta * location.trendPerYear);
};

const buildWetbulbYearRows = (): RuntimeWetbulbRow[] => {
  const rows: RuntimeWetbulbRow[] = [];

  for (const location of LOCATIONS) {
    for (const year of YEARS) {
      const seasonalBase = getAverageWetbulb(location.location_id, year);

      const pointCount = year === 2026 ? 8 : 10;
      for (let index = 0; index < pointCount; index++) {
        const month = 6 + Math.floor(index / 4);
        const day = 1 + (index % 4) * 7;
        const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const wetbulb = round(seasonalBase + (index - 4.5) * 0.19);

        rows.push({
          date,
          location_id: location.location_id,
          wetbulb,
          wetbulb_avg: round(wetbulb + AVG_BASIS_OFFSET),
          year,
        });
      }
    }
  }

  return rows;
};

const wetbulbYearRows = buildWetbulbYearRows();

const MOCK_TABLES: RuntimeMockTables = {
  wetbulb_city_rankings_view: LOCATIONS.flatMap((location) =>
    YEARS.flatMap((year) =>
      GRAPH_SEASONS.map((season) => {
        const avg = round(
          getAverageWetbulb(location.location_id, year) +
            SEASONAL_AVG_OFFSETS[season],
        );
        const max = round(
          getAverageWetbulb(location.location_id, year) +
            SEASONAL_MAX_OFFSETS[season],
        );
        const forecastWetbulb = round(
          getAverageWetbulb(location.location_id, 2025) +
            SEASONAL_AVG_OFFSETS[season] +
            (2100 - 2025) * location.trendPerYear,
        );
        return {
          avg_wetbulb: avg,
          avg_wetbulb_avg: round(avg + AVG_BASIS_OFFSET),
          change_from_baseline: round((year - 2000) * location.trendPerYear),
          change_from_baseline_avg: round(
            (year - 2000) * location.trendPerYear + AVG_BASIS_OFFSET,
          ),
          city: location.city,
          future_lower: round(forecastWetbulb - 1.2),
          future_lower_avg: round(forecastWetbulb - 1.2 + AVG_BASIS_OFFSET),
          future_upper: round(forecastWetbulb + 1.2),
          future_upper_avg: round(forecastWetbulb + 1.2 + AVG_BASIS_OFFSET),
          location_id: location.location_id,
          max_wetbulb: max,
          max_wetbulb_avg: round(max + AVG_BASIS_OFFSET),
          p10: round(avg - 1.4),
          p10_avg: round(avg - 1.4 + AVG_BASIS_OFFSET),
          p5: round(avg - 1.8),
          p5_avg: round(avg - 1.8 + AVG_BASIS_OFFSET),
          p90: round(avg + 1.4),
          p90_avg: round(avg + 1.4 + AVG_BASIS_OFFSET),
          p95: round(avg + 1.8),
          p95_avg: round(avg + 1.8 + AVG_BASIS_OFFSET),
          season,
          state: location.state,
          year,
        };
      }),
    ),
  ),
  locations: LOCATIONS.map(({ city, lat, lng, location_id, state }) => ({
    city,
    id: location_id,
    lat,
    lng,
    location_id,
    state,
  })),
  wetbulb_change: LOCATIONS.map((location) => ({
    change: round(location.trendPerYear * 10),
    location_id: location.location_id,
  })),
  wetbulb_forecast: LOCATIONS.flatMap((location) => {
    const lastHistoricalYear = 2025;

    return GRAPH_SEASONS.flatMap((season) => {
      const lastHistoricalAvg = round(
        getAverageWetbulb(location.location_id, lastHistoricalYear) +
          SEASONAL_AVG_OFFSETS[season],
      );

      return FORECAST_YEARS.map((year) => {
        const yearsAhead = year - lastHistoricalYear;
        const forecastWetbulb = round(
          lastHistoricalAvg + yearsAhead * location.trendPerYear,
        );
        const forecastWetbulbAvg = round(forecastWetbulb + AVG_BASIS_OFFSET);

        return {
          location_id: location.location_id,
          lower: round(forecastWetbulb - 1.2),
          lower_avg: round(forecastWetbulbAvg - 1.2),
          wetbulb: forecastWetbulb,
          wetbulb_avg: forecastWetbulbAvg,
          season,
          upper: round(forecastWetbulb + 1.2),
          upper_avg: round(forecastWetbulbAvg + 1.2),
          year,
        };
      });
    });
  }),
  wetbulb_forecast_max: LOCATIONS.flatMap((location) => {
    const lastHistoricalYear = 2025;

    return GRAPH_SEASONS.flatMap((season) => {
      const lastHistoricalMax = round(
        getAverageWetbulb(location.location_id, lastHistoricalYear) +
          SEASONAL_MAX_OFFSETS[season],
      );

      return FORECAST_YEARS.map((year) => {
        const yearsAhead = year - lastHistoricalYear;
        const forecastWetbulb = round(
          lastHistoricalMax + yearsAhead * location.trendPerYear,
        );
        const forecastWetbulbAvg = round(forecastWetbulb + AVG_BASIS_OFFSET);

        return {
          location_id: location.location_id,
          lower: round(forecastWetbulb - 1.2),
          lower_avg: round(forecastWetbulbAvg - 1.2),
          wetbulb: forecastWetbulb,
          wetbulb_avg: forecastWetbulbAvg,
          season,
          upper: round(forecastWetbulb + 1.2),
          upper_avg: round(forecastWetbulbAvg + 1.2),
          year,
        };
      });
    });
  }),
  wetbulb_percentiles: LOCATIONS.flatMap((location) =>
    YEARS.map((year) => {
      const avg = getAverageWetbulb(location.location_id, year);
      return {
        location_id: location.location_id,
        p10: round(avg - 1.4),
        p90: round(avg + 1.4),
        year,
      };
    }),
  ),
  wetbulb: wetbulbYearRows,
  wetbulb_year_stats: LOCATIONS.flatMap((location) =>
    YEARS.flatMap((year) =>
      GRAPH_SEASONS.map((season) => {
        const avg = getAverageWetbulb(location.location_id, year);
        const maxWetbulb = round(avg + SEASONAL_MAX_OFFSETS[season]);
        return {
          avg_wetbulb: round(avg + SEASONAL_AVG_OFFSETS[season]),
          avg_wetbulb_avg: round(
            avg + SEASONAL_AVG_OFFSETS[season] + AVG_BASIS_OFFSET,
          ),
          location_id: location.location_id,
          max_wetbulb: maxWetbulb,
          max_wetbulb_avg: round(maxWetbulb + AVG_BASIS_OFFSET),
          p10: round(avg - 1.4),
          p10_avg: round(avg - 1.4 + AVG_BASIS_OFFSET),
          p5: round(avg - 1.8),
          p5_avg: round(avg - 1.8 + AVG_BASIS_OFFSET),
          p90: round(avg + 1.4),
          p90_avg: round(avg + 1.4 + AVG_BASIS_OFFSET),
          p95: round(avg + 1.8),
          p95_avg: round(avg + 1.8 + AVG_BASIS_OFFSET),
          season,
          year,
        };
      }),
    ),
  ),
};

const hasTable = (table: string): table is keyof RuntimeMockTables =>
  Object.hasOwn(MOCK_TABLES, table);

const getTableRows = (table: string): MockRow[] => {
  if (!hasTable(table)) {
    return [];
  }

  return MOCK_TABLES[table];
};

export function getRuntimeMockTableRows<TTable extends keyof RuntimeMockTables>(
  table: TTable,
): RuntimeMockTables[TTable];
export function getRuntimeMockTableRows(table: string): MockRow[];
export function getRuntimeMockTableRows(table: string) {
  return getTableRows(table).map((row) => structuredClone(row));
}
