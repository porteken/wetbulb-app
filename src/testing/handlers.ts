import {
  filterReferenceRowsBySeason,
  mapReferenceRowsToGraphData,
  mapTrendRowsToGraphData,
} from "@/lib/api/graph-data";
import { DEFAULT_GRAPH_SEASON, normalizeGraphSeason } from "@/lib/constants";
import { sortBy } from "@/lib/sort-by";
import { getRuntimeMockTableRows } from "@/testing/runtime-mocks";
import { http, HttpResponse } from "msw";

type RuntimeTrendOption = "avg" | "max";

const getTrendMetricColumn = (option: RuntimeTrendOption) =>
  option === "max" ? "max_wetbulb" : "avg_wetbulb";

const getRuntimeTrendRows = (
  locationId: number,
  option: RuntimeTrendOption,
  season: string,
) => {
  const rows = getRuntimeMockTableRows("wetbulb_year_stats");
  const metricColumn = getTrendMetricColumn(option);

  return sortBy(
    rows
      .filter((row) => row.location_id === locationId && row.season === season)
      .map((row) => ({
        location_id: row.location_id,
        wetbulb: Number(row[metricColumn]),
        year: row.year,
      })),
    "year",
  );
};

const getRuntimeReferenceRows = (locationId: number, year: string) => {
  const start = `${year}-01-01`;
  const end = `${Number(year) + 1}-01-01`;
  const rows = getRuntimeMockTableRows("wetbulb");

  return sortBy(
    rows
      .filter(
        (row) =>
          row.location_id === locationId && row.date >= start && row.date < end,
      )
      .map((row) => ({
        date: row.date,
        wetbulb: row.wetbulb,
      })),
    "date",
  );
};

const getRuntimeHistoricalYear = (locationId: number, season: string) => {
  const rows = getRuntimeMockTableRows("wetbulb_year_stats");

  return sortBy(
    rows.filter(
      (row) => row.location_id === locationId && row.season === season,
    ),
    "year",
    false,
  )[0];
};

const getRuntimeForecastRows = (
  locationId: number,
  season: string,
  lastHistoricalYear: number,
  targetYear: number,
  option: string = "avg",
) => {
  const table = option === "max" ? "wetbulb_forecast_max" : "wetbulb_forecast";
  const rows = getRuntimeMockTableRows(table);

  return sortBy(
    rows.filter(
      (row) =>
        row.location_id === locationId &&
        row.season === season &&
        row.year > lastHistoricalYear &&
        row.year <= targetYear,
    ),
    "year",
  );
};

export const handlers = [
  http.get("*/api/data/trend", ({ request }) => {
    const url = new URL(request.url);
    const locationId = Number(url.searchParams.get("locationId"));
    const option = (url.searchParams.get("option") ??
      "avg") as RuntimeTrendOption;
    const season = normalizeGraphSeason(
      url.searchParams.get("season") ?? DEFAULT_GRAPH_SEASON,
    );

    const rows = getRuntimeTrendRows(locationId, option, season);

    return HttpResponse.json(mapTrendRowsToGraphData(rows), { status: 200 });
  }),
  http.get("*/api/data/reference", ({ request }) => {
    const url = new URL(request.url);
    const locationId = Number(url.searchParams.get("locationId"));
    const year = url.searchParams.get("year") ?? "2000";
    const season = normalizeGraphSeason(
      url.searchParams.get("season") ?? DEFAULT_GRAPH_SEASON,
    );

    const rows = getRuntimeReferenceRows(locationId, year);
    const data = mapReferenceRowsToGraphData(
      filterReferenceRowsBySeason(rows, season),
    );

    return HttpResponse.json(data, { status: 200 });
  }),
  http.get("*/api/data/forecast", ({ request }) => {
    const url = new URL(request.url);
    const locationId = Number(url.searchParams.get("locationId"));
    const season = normalizeGraphSeason(
      url.searchParams.get("season") ?? DEFAULT_GRAPH_SEASON,
    );
    const option = url.searchParams.get("option") ?? "avg";
    const yearsAhead = Number(url.searchParams.get("yearsAhead") ?? "0");

    const historicalRow = getRuntimeHistoricalYear(locationId, season);
    if (!historicalRow) {
      return HttpResponse.json(null, { status: 200 });
    }

    const forecastRows = getRuntimeForecastRows(
      locationId,
      season,
      historicalRow.year,
      historicalRow.year + yearsAhead,
      option,
    );

    return HttpResponse.json(
      forecastRows.length === 0
        ? null
        : {
            forecastValues: forecastRows.map(({ wetbulb }) => Number(wetbulb)),
            forecastYears: forecastRows.map(({ year }) => year),
            lowerBound10: forecastRows.map(({ lower }) => Number(lower)),
            upperBound90: forecastRows.map(({ upper }) => Number(upper)),
          },
      { status: 200 },
    );
  }),
];
