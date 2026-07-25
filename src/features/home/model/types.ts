import type { GraphSeason } from "@/lib/constants";
import type { LocationProperties } from "@/types/types";

export interface MapProperties {
  initialForecastEnabled: boolean;
  initialForecastYearsAhead: number;
  initialGraphMeasure: string;
  initialGraphSeason: GraphSeason;
  locations: LocationProperties[];
}
