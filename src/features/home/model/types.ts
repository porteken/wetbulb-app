import type { GraphSeason } from "@/lib/constants";
import type { LocationOptionSection, LocationProperties } from "@/types/types";

export interface MapProperties {
  initialForecastEnabled: boolean;
  initialForecastYearsAhead: number;
  initialGraphMeasure: string;
  initialGraphSeason: GraphSeason;
  LocationOptions: LocationOptionSection[];
  locations: LocationProperties[];
}
