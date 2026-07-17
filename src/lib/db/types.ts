export type NumericLike = number | string;

export interface WetbulbCityRankingsViewTable {
  avg_wetbulb: NumericLike;
  avg_wetbulb_avg: NumericLike;
  change_from_2000: NumericLike | null;
  change_from_2000_avg: NumericLike | null;
  city: string;
  future_lower: NumericLike | null;
  future_lower_avg: NumericLike | null;
  future_upper: NumericLike | null;
  future_upper_avg: NumericLike | null;
  location_id: number;
  max_wetbulb: NumericLike | null;
  max_wetbulb_avg: NumericLike | null;
  p10: NumericLike | null;
  p10_avg: NumericLike | null;
  p90: NumericLike | null;
  p90_avg: NumericLike | null;
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
  lower_avg: NumericLike | null;
  wetbulb: NumericLike;
  wetbulb_avg: NumericLike | null;
  season?: string | null;
  upper: NumericLike;
  upper_avg: NumericLike | null;
  year: number;
}

interface WetbulbTable {
  date: Date | string;
  location_id: number;
  wetbulb: NumericLike;
}

export interface WetbulbYearStatsTable {
  avg_wetbulb: NumericLike;
  avg_wetbulb_avg: NumericLike;
  location_id: number;
  max_wetbulb: NumericLike;
  max_wetbulb_avg: NumericLike | null;
  p10: NumericLike | null;
  p10_avg: NumericLike | null;
  p90: NumericLike | null;
  p90_avg: NumericLike | null;
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
