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
  includeLatestYear?: boolean;
}

export const YearOptions = ({
  includeLatestYear = true,
}: YearOptionsConfig = {}): SelectOptionProperties[] => {
  const { END, START } = GRAPH_CONFIG.YEAR_RANGE;
  const endYear = includeLatestYear ? END : END - 1;

  return Array.from({ length: endYear - START + 1 }, (_, index) => {
    const year = (START + index).toString();

    return { key: year, label: year };
  });
};

export const isSelectableReferenceYear = (year: string): boolean => {
  const numericYear = Number(year);
  const { END, START } = GRAPH_CONFIG.YEAR_RANGE;

  return (
    Number.isInteger(numericYear) &&
    numericYear >= START &&
    numericYear < END &&
    year === numericYear.toString()
  );
};
