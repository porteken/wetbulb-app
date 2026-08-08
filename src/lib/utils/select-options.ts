import { GRAPH_CONFIG, GRAPH_SEASONS } from "@/lib/constants";

import type { SelectOptionProperties } from "@/types/types";

export const GraphOptions: SelectOptionProperties[] = [
  { key: GRAPH_CONFIG.TREND_OPTIONS.AVG, label: "Average" },
  { key: GRAPH_CONFIG.TREND_OPTIONS.MAX, label: "Max" },
];

export const SeasonOptions: SelectOptionProperties[] = GRAPH_SEASONS.map(
  (season) => ({ key: season, label: season }),
);

interface YearOptionsConfig {
  endYear?: number;
  includeLatestYear?: boolean;
  startYear?: number;
}

export const YearOptions = ({
  endYear = GRAPH_CONFIG.YEAR_RANGE.END,
  includeLatestYear = true,
  startYear = GRAPH_CONFIG.YEAR_RANGE.START,
}: YearOptionsConfig = {}): SelectOptionProperties[] => {
  const lastYear = includeLatestYear ? endYear : endYear - 1;

  return Array.from(
    { length: Math.max(lastYear - startYear + 1, 0) },
    (_, index) => {
      const year = (startYear + index).toString();

      return { key: year, label: year };
    },
  );
};

export const isSelectableReferenceYear = (
  year: string,
  startYear: number = GRAPH_CONFIG.YEAR_RANGE.START,
  endYear: number = GRAPH_CONFIG.YEAR_RANGE.END,
): boolean => {
  const numericYear = Number(year);

  return (
    Number.isInteger(numericYear) &&
    numericYear >= startYear &&
    numericYear < endYear &&
    year === numericYear.toString()
  );
};
