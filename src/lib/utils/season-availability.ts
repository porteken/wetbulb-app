import { GRAPH_CONFIG, type GraphSeason } from "@/lib/constants";

const SEASON_START_MONTH: Record<Exclude<GraphSeason, "Annual">, number> = {
  Fall: 8,
  Spring: 2,
  Summer: 5,
  Winter: 11,
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
