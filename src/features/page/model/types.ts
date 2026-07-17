import type { GraphSeason, WetbulbBasis } from "@/lib/constants";
import type { ForecastGraphData } from "@/lib/utils/trend-analysis";
import type { LocationOptionSection, LocationProperties } from "@/types/types";

export interface PageProperties {
  CurrentDates: Date[];
  CurrentWetbulbs: number[];
  graphDataError: boolean;
  IncreasePerYear: number;
  id: number;
  initialForecastData?: ForecastGraphData;
  initialForecastEnabled: boolean;
  initialForecastYearsAhead: number;
  initialGraphMeasure: string;
  initialGraphSeason: GraphSeason;
  initialReferenceYear: string;
  initialWetbulbBasis: WetbulbBasis;
  location: LocationProperties;
  LocationOptions: LocationOptionSection[];
  ReferenceWetbulbs: number[];
  TrendlineWetbulbs: number[];
  YearWetbulbs: number[];
  Years: number[];
}
