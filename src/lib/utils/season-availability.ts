import { GRAPH_CONFIG, type GraphSeason } from "@/lib/constants";

const SEASON_START_MONTH: Record<Exclude<GraphSeason, "Annual">, number> = {
  Fall: 8,
  Spring: 2,
  Summer: 5,
  Winter: 11,
};

export const getCurrentGraphSeason = (
  now = new Date(),
): Exclude<GraphSeason, "Annual"> => {
  const month = now.getUTCMonth();

  if (month < SEASON_START_MONTH.Spring) {
    return "Winter";
  }
  if (month < SEASON_START_MONTH.Summer) {
    return "Spring";
  }
  if (month < SEASON_START_MONTH.Fall) {
    return "Summer";
  }
  if (month < SEASON_START_MONTH.Winter) {
    return "Fall";
  }

  return "Winter";
};

const isPastDataYear = (now: Date): boolean =>
  GRAPH_CONFIG.YEAR_RANGE.END < now.getUTCFullYear();

const isFutureDataYear = (now: Date): boolean =>
  GRAPH_CONFIG.YEAR_RANGE.END > now.getUTCFullYear();

export const isCurrentYearRankingAvailable = (
  season: GraphSeason,
  now = new Date(),
): boolean => {
  if (season === "Annual" || isFutureDataYear(now)) {
    return false;
  }
  if (isPastDataYear(now)) {
    return true;
  }

  return now.getUTCMonth() >= SEASON_START_MONTH[season];
};

export const isCurrentYearTrendAvailable = (
  season: GraphSeason,
  now = new Date(),
): boolean => {
  if (season === "Annual" || isFutureDataYear(now)) {
    return false;
  }
  if (isPastDataYear(now)) {
    return true;
  }

  return now.getUTCMonth() >= SEASON_START_MONTH[season];
};
