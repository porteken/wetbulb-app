export interface FetchLocationProperties {
  LocationOptions: LocationOptionSection[];
  locations: LocationProperties[];
}

export interface LocationOptionSection {
  items: LocationOptionItem[];
  title: string;
}

export interface LocationProperties {
  city: string;
  lat: number;
  lng: number;
  location_id: number;
  state: string;
}

export interface NavProperties {
  compact?: boolean;
  id?: number;
  LocationOptions: LocationOptionSection[];
  name?: string;
}

export interface ReferenceGraphDataProperties {
  dates: Date[];
  wetbulbs: number[];
}

export interface SelectOptionProperties {
  key: string;
  label: string;
}

export interface TrendGraphDataProperties {
  increase_per_year: number;
  trendline_wetbulbs: number[];
  year_wetbulbs: number[];
  years: number[];
}

interface LocationOptionItem {
  key: number;
  title: string;
}
