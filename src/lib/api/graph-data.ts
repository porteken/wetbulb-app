import { DEFAULT_GRAPH_SEASON, type GraphSeason } from "@/lib/constants";
import { SimpleLinearRegression } from "@/lib/utils/simple-linear-regression";
import {
  validateDates,
  validateWetbulbs,
  validateYearWetbulbs,
  validateYears,
} from "@/lib/utils/validation";

import type {
  ReferenceGraphDataProperties,
  TrendGraphDataProperties,
} from "@/types/types";

interface ReferenceGraphRow {
  date: string;
  wetbulb: number;
}

const SEASON_MONTHS: Record<Exclude<GraphSeason, "Annual">, number[]> = {
  Fall: [9, 10, 11],
  Spring: [3, 4, 5],
  Summer: [6, 7, 8],
  Winter: [12, 1, 2],
};

export const filterReferenceRowsBySeason = <TRow extends ReferenceGraphRow>(
  rows: TRow[],
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
): TRow[] => {
  if (season === DEFAULT_GRAPH_SEASON) {
    return rows;
  }

  const allowedMonths = SEASON_MONTHS[season];

  return rows.filter(({ date }) => {
    const month = Number(date.slice(5, 7));
    return allowedMonths.includes(month);
  });
};

interface TrendGraphRow {
  wetbulb: number;
  year: number;
}

export const mapReferenceRowsToGraphData = (
  rows: ReferenceGraphRow[],
): ReferenceGraphDataProperties => {
  const dates = rows.map(({ date }) => new Date(date));
  const wetbulbs = rows.map(({ wetbulb }) => wetbulb);

  validateDates(dates);
  validateWetbulbs(wetbulbs);

  return { dates, wetbulbs };
};

export const alignReferenceGraphData = (
  currentData: ReferenceGraphDataProperties,
  referenceData: ReferenceGraphDataProperties,
) => {
  const currentByCalendarDay = new Map(
    currentData.dates.map((date, index) => [
      date.toISOString().slice(5, 10),
      currentData.wetbulbs[index],
    ]),
  );

  return {
    dates: referenceData.dates,
    referenceWetbulbs: referenceData.wetbulbs,
    wetbulbs: referenceData.dates.map(
      (date) =>
        currentByCalendarDay.get(date.toISOString().slice(5, 10)) ?? Number.NaN,
    ),
  };
};

export const mapTrendRowsToGraphData = (
  rows: TrendGraphRow[],
): TrendGraphDataProperties => {
  const years = rows.map(({ year }) => year);
  const year_wetbulbs = rows.map(({ wetbulb }) => wetbulb);

  if (years.length === 0 || year_wetbulbs.length === 0) {
    return {
      increase_per_year: 0,
      trendline_wetbulbs: [],
      year_wetbulbs: [],
      years: [],
    };
  }

  validateYears(years);
  validateYearWetbulbs(year_wetbulbs);

  const regression = new SimpleLinearRegression(years, year_wetbulbs);

  return {
    increase_per_year: regression.slope,
    trendline_wetbulbs: years.map((year) => regression.predict(year)),
    year_wetbulbs,
    years,
  };
};
