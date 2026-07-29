import {
  FetchForecastData,
  FetchLocations,
  FetchReferenceGraphData,
  FetchTrendGraphData,
} from "@/lib/api/fetch-server";
import { alignReferenceGraphData } from "@/lib/api/graph-data";
import {
  DEFAULT_REFERENCE_YEAR,
  DEFAULT_GRAPH_SEASON,
  DEFAULT_FORECAST_ENABLED,
  DEFAULT_DATA_REGION,
  DEFAULT_FORECAST_YEARS_AHEAD,
  DEFAULT_GRAPH_MEASURE,
  DEFAULT_WETBULB_BASIS,
  FORECAST_ENABLED_COOKIE_NAME,
  FORECAST_YEARS_AHEAD_COOKIE_NAME,
  GRAPH_CONFIG,
  GRAPH_MEASURE_COOKIE_NAME,
  GRAPH_SEASON_COOKIE_NAME,
  REFERENCE_YEAR_COOKIE_NAME,
  MAX_FORECAST_YEARS_AHEAD,
  MIN_FORECAST_YEARS_AHEAD,
  normalizeGraphSeason,
  normalizeWetbulbBasis,
  regionForLocationId,
  type DataRegion,
  type GraphSeason,
  type WetbulbBasis,
  WETBULB_BASIS_COOKIE_NAME,
} from "@/lib/constants";
import { isSelectableReferenceYear } from "@/lib/utils/select-options";
import { getLatestCookieValue } from "@/lib/utils/server-cookies";
import { cookies } from "next/headers";

import type { PageProperties } from "../model/types";
import type { ForecastGraphData } from "@/lib/utils/trend-analysis";
import type {
  LocationOptionSection,
  LocationProperties,
  ReferenceGraphDataProperties,
  TrendGraphDataProperties,
} from "@/types/types";

interface GraphData {
  dates: Date[];
  forecast_data?: ForecastGraphData;
  graphDataError: boolean;
  increase_per_year: number;
  wetbulbs: number[];
  reference_wetbulbs: number[];
  trendline_wetbulbs: number[];
  year_wetbulbs: number[];
  years: number[];
}

interface LocationPageError {
  message: string;
  title: string;
}

type LocationPageLoadResult =
  | {
      payload: LocationPageError;
      status: "database-error";
    }
  | {
      payload: LocationPageError;
      status: "invalid-location";
    }
  | {
      payload: PageProperties;
      status: "success";
    };

interface LocationPagePreferences {
  initialForecastEnabled: boolean;
  initialForecastYearsAhead: number;
  initialGraphMeasure: string;
  initialGraphSeason: GraphSeason;
  initialReferenceYear: string;
  initialWetbulbBasis: WetbulbBasis;
}

const createEmptyGraphData = (): GraphData => ({
  dates: [],
  graphDataError: false,
  increase_per_year: 0,
  wetbulbs: [],
  reference_wetbulbs: [],
  trendline_wetbulbs: [],
  year_wetbulbs: [],
  years: [],
});

const getFulfilledValue = <T>(
  result: PromiseSettledResult<T>,
): T | undefined => (result.status === "fulfilled" ? result.value : undefined);

const resolveReferenceGraphData = (
  currentData: ReferenceGraphDataProperties | undefined,
  referenceData: ReferenceGraphDataProperties | undefined,
  emptyGraphData: GraphData,
) => {
  if (!currentData || !referenceData) {
    return {
      dates: emptyGraphData.dates,
      wetbulbs: emptyGraphData.wetbulbs,
      reference_wetbulbs: emptyGraphData.reference_wetbulbs,
    };
  }

  const alignedData = alignReferenceGraphData(currentData, referenceData);
  return {
    dates: alignedData.dates,
    wetbulbs: alignedData.wetbulbs,
    reference_wetbulbs: alignedData.referenceWetbulbs,
  };
};

const resolveTrendGraphData = (
  trendData: TrendGraphDataProperties | undefined,
  emptyGraphData: GraphData,
) => ({
  increase_per_year:
    trendData?.increase_per_year ?? emptyGraphData.increase_per_year,
  trendline_wetbulbs:
    trendData?.trendline_wetbulbs ?? emptyGraphData.trendline_wetbulbs,
  year_wetbulbs: trendData?.year_wetbulbs ?? emptyGraphData.year_wetbulbs,
  years: trendData?.years ?? emptyGraphData.years,
});

const parseLocationId = (id: string): number | undefined => {
  const locationId = Number(id);
  if (!Number.isInteger(locationId) || locationId < 0) {
    return undefined;
  }

  return locationId;
};

const getPreferencesFromCookies =
  async (): Promise<LocationPagePreferences> => {
    const cookieStore = await cookies();
    const initialGraphMeasure =
      getLatestCookieValue(cookieStore, GRAPH_MEASURE_COOKIE_NAME) ??
      DEFAULT_GRAPH_MEASURE;
    const initialGraphSeason = normalizeGraphSeason(
      getLatestCookieValue(cookieStore, GRAPH_SEASON_COOKIE_NAME) ??
        DEFAULT_GRAPH_SEASON,
    );
    const rawReferenceYear = getLatestCookieValue(
      cookieStore,
      REFERENCE_YEAR_COOKIE_NAME,
    );
    const initialReferenceYear =
      rawReferenceYear && isSelectableReferenceYear(rawReferenceYear)
        ? rawReferenceYear
        : DEFAULT_REFERENCE_YEAR;
    const initialForecastEnabled =
      getLatestCookieValue(cookieStore, FORECAST_ENABLED_COOKIE_NAME) === "true"
        ? true
        : DEFAULT_FORECAST_ENABLED;

    const rawForecastYearsAhead = Number(
      getLatestCookieValue(cookieStore, FORECAST_YEARS_AHEAD_COOKIE_NAME),
    );
    const initialForecastYearsAhead =
      Number.isInteger(rawForecastYearsAhead) &&
      rawForecastYearsAhead >= MIN_FORECAST_YEARS_AHEAD &&
      rawForecastYearsAhead <= MAX_FORECAST_YEARS_AHEAD
        ? rawForecastYearsAhead
        : DEFAULT_FORECAST_YEARS_AHEAD;

    const initialWetbulbBasis = normalizeWetbulbBasis(
      getLatestCookieValue(cookieStore, WETBULB_BASIS_COOKIE_NAME) ??
        DEFAULT_WETBULB_BASIS,
    );

    return {
      initialForecastEnabled,
      initialForecastYearsAhead,
      initialGraphMeasure,
      initialGraphSeason,
      initialReferenceYear,
      initialWetbulbBasis,
    };
  };

interface FetchGraphDataOptions {
  basis: WetbulbBasis;
  forecastEnabled: boolean;
  forecastYearsAhead: number;
  locationId: number;
  measure: string;
  referenceYear: string;
  season: GraphSeason;
}

const fetchGraphData = async ({
  basis,
  forecastEnabled,
  forecastYearsAhead,
  locationId,
  measure,
  referenceYear,
  season,
}: FetchGraphDataOptions): Promise<GraphData> => {
  const forecastPromise = forecastEnabled
    ? FetchForecastData(locationId, forecastYearsAhead, {
        basis,
        option: measure,
        season,
      })
    : undefined;

  const [trendResult, currentResult, referenceResult] =
    await Promise.allSettled([
      FetchTrendGraphData(measure, locationId, season, basis),
      FetchReferenceGraphData(
        String(GRAPH_CONFIG.YEAR_RANGE.END),
        locationId,
        DEFAULT_GRAPH_SEASON,
        basis,
      ),
      FetchReferenceGraphData(
        referenceYear,
        locationId,
        DEFAULT_GRAPH_SEASON,
        basis,
      ),
    ]);

  let forecastData: ForecastGraphData | undefined;
  if (forecastPromise) {
    try {
      forecastData = await forecastPromise;
    } catch {}
  }

  const emptyGraphData = createEmptyGraphData();
  const trendData = getFulfilledValue(trendResult);
  const currentData = getFulfilledValue(currentResult);
  const referenceData = getFulfilledValue(referenceResult);
  const graphDataError =
    trendResult.status === "rejected" &&
    currentResult.status === "rejected" &&
    referenceResult.status === "rejected";
  const referenceGraphData = resolveReferenceGraphData(
    currentData,
    referenceData,
    emptyGraphData,
  );
  const trendGraphData = resolveTrendGraphData(trendData, emptyGraphData);

  return {
    ...referenceGraphData,
    ...trendGraphData,
    forecast_data: forecastData,
    graphDataError,
  };
};

const fetchLocationData = async (
  region: DataRegion,
): Promise<
  | undefined
  | {
      LocationOptions: LocationOptionSection[];
      locations: LocationProperties[];
    }
> => {
  try {
    const result = await FetchLocations(region);
    if (result.locations.length > 0 || region === DEFAULT_DATA_REGION) {
      return {
        LocationOptions: result.LocationOptions,
        locations: result.locations,
      };
    }

    const fallback = await FetchLocations(DEFAULT_DATA_REGION);
    return {
      LocationOptions: fallback.LocationOptions,
      locations: fallback.locations,
    };
  } catch {
    return undefined;
  }
};

const createDatabaseError = (
  title = "Database Connection Error",
  message = "Unable to connect to the database. Please try again later.",
): LocationPageError => ({
  message,
  title,
});

const createInvalidLocationError = (
  title = "Invalid location ID",
  message = "The provided location ID is not valid.",
): LocationPageError => ({
  message,
  title,
});

export const loadLocationPageData = async (
  rawLocationId: string,
): Promise<LocationPageLoadResult> => {
  const locationId = parseLocationId(rawLocationId);
  if (locationId === undefined) {
    return {
      payload: createInvalidLocationError(),
      status: "invalid-location",
    };
  }

  const preferences = await getPreferencesFromCookies();

  const [locationData, graphData] = await Promise.all([
    fetchLocationData(regionForLocationId(locationId)),
    fetchGraphData({
      basis: preferences.initialWetbulbBasis,
      forecastEnabled: preferences.initialForecastEnabled,
      forecastYearsAhead: preferences.initialForecastYearsAhead,
      locationId,
      measure: preferences.initialGraphMeasure,
      referenceYear: preferences.initialReferenceYear,
      season: preferences.initialGraphSeason,
    }),
  ]);

  if (!locationData) {
    return {
      payload: createDatabaseError(),
      status: "database-error",
    };
  }

  const { LocationOptions, locations } = locationData;
  if (locations.length === 0) {
    return {
      payload: createDatabaseError(
        "No Data Available",
        "Location data could not be loaded. The database may be temporarily unavailable.",
      ),
      status: "database-error",
    };
  }

  const selectedLocation = locations.find(
    (location) => location.location_id === locationId,
  );
  if (!selectedLocation) {
    return {
      payload: createInvalidLocationError(
        "Location not found",
        "The requested location could not be found.",
      ),
      status: "invalid-location",
    };
  }

  return {
    payload: {
      CurrentDates: graphData.dates,
      CurrentWetbulbs: graphData.wetbulbs,
      graphDataError: graphData.graphDataError,
      IncreasePerYear: graphData.increase_per_year,
      id: locationId,
      initialForecastData: graphData.forecast_data,
      initialForecastEnabled: preferences.initialForecastEnabled,
      initialForecastYearsAhead: preferences.initialForecastYearsAhead,
      initialGraphMeasure: preferences.initialGraphMeasure,
      initialGraphSeason: preferences.initialGraphSeason,
      initialReferenceYear: preferences.initialReferenceYear,
      initialWetbulbBasis: preferences.initialWetbulbBasis,
      location: selectedLocation,
      LocationOptions,
      ReferenceWetbulbs: graphData.reference_wetbulbs,
      TrendlineWetbulbs: graphData.trendline_wetbulbs,
      YearWetbulbs: graphData.year_wetbulbs,
      Years: graphData.years,
    },
    status: "success",
  };
};
