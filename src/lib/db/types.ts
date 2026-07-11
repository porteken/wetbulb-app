export type NumericLike = number | string;

export interface WetbulbCityRankingsViewTable {
  avg_wetbulb: NumericLike;
  change_from_2000: NumericLike | null;
  city: string;
  future_lower: NumericLike | null;
  future_upper: NumericLike | null;
  location_id: number;
  max_wetbulb: NumericLike | null;
  p10: NumericLike | null;
  p90: NumericLike | null;
  season?: string | null;
  state: string;
  year: number;
}

interface LocationsTable {
  city: string;
  id?: number | null;
  lat: NumericLike;
  lng: NumericLike;
  location_id?: number | null;
  state: string;
}

export interface WetbulbForecastTable {
  location_id: number;
  lower: NumericLike;
  wetbulb: NumericLike;
  season?: string | null;
  upper: NumericLike;
  year: number;
}

interface WetbulbTable {
  date: Date | string;
  location_id: number;
  wetbulb: NumericLike;
}

export interface WetbulbYearStatsTable {
  avg_wetbulb: NumericLike;
  location_id: number;
  max_wetbulb: NumericLike;
  p10: NumericLike | null;
  p90: NumericLike | null;
  season?: string | null;
  year: number;
}

export interface Database {
  wetbulb_city_rankings_view: WetbulbCityRankingsViewTable;
  locations: LocationsTable;
  wetbulb: WetbulbTable;
  wetbulb_forecast: WetbulbForecastTable;
  wetbulb_forecast_max: WetbulbForecastTable;
  wetbulb_year_stats: WetbulbYearStatsTable;
}
