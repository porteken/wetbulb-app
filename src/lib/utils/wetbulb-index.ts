import {
  DEFAULT_GRAPH_SEASON,
  GRAPH_CONFIG,
  type GraphSeason,
} from "@/lib/constants";

export interface WetbulbDescription {
  colorClass: string;
  confidenceRange?: string;
  prefix: string;
  value: string;
}

type WetbulbIndexLevel =
  | "None"
  | "Low Risk"
  | "Moderate Risk"
  | "High Risk"
  | "Extreme Risk"
  | "Empirical Limit"
  | "Theoretical Limit";

interface WetbulbIndexLegendItem {
  colorClass: string;
  fillClass: string;
  level: WetbulbIndexLevel;
  max?: number;
  rangeLabel: string;
}

export const WETBULB_INDEX_LEGEND_ITEMS: readonly WetbulbIndexLegendItem[] = [
  {
    colorClass: "text-green-600",
    fillClass: "bg-green-500",
    level: "None",
    max: 68,
    rangeLabel: "< 68°F",
  },
  {
    colorClass: "text-yellow-600",
    fillClass: "bg-yellow-400",
    level: "Low Risk",
    max: 76,
    rangeLabel: "68–76°F",
  },
  {
    colorClass: "text-amber-600",
    fillClass: "bg-amber-500",
    level: "Moderate Risk",
    max: 81,
    rangeLabel: "77–81°F",
  },
  {
    colorClass: "text-orange-600",
    fillClass: "bg-orange-500",
    level: "High Risk",
    max: 84,
    rangeLabel: "82–84°F",
  },
  {
    colorClass: "text-red-600",
    fillClass: "bg-red-500",
    level: "Extreme Risk",
    max: 86,
    rangeLabel: "84–86°F",
  },
  {
    colorClass: "text-red-800",
    fillClass: "bg-red-700",
    level: "Empirical Limit",
    max: 94,
    rangeLabel: "87–94°F",
  },
  {
    colorClass: "text-purple-800",
    fillClass: "bg-purple-700",
    level: "Theoretical Limit",
    rangeLabel: "> 95°F",
  },
];

interface WetbulbInfo {
  color: string;
  level: WetbulbIndexLevel;
  value: string;
}

const MIN_CONFIDENCE_INTERVAL = 0.1;

function buildWetbulbInfo(
  item: WetbulbIndexLegendItem,
  wetbulbValue: number,
): WetbulbInfo {
  return {
    color: item.colorClass,
    level: item.level,
    value: wetbulbValue.toFixed(1),
  };
}

export function getForecastWetbulbDescription(
  wetbulbValue: number,
  year: number,
  lowerBound10?: number,
  upperBound90?: number,
): WetbulbDescription {
  const info = getWetbulbInfo(wetbulbValue);

  const hasValidBounds =
    lowerBound10 !== undefined &&
    upperBound90 !== undefined &&
    !Number.isNaN(lowerBound10) &&
    !Number.isNaN(upperBound90) &&
    Math.abs(upperBound90 - lowerBound10) > MIN_CONFIDENCE_INTERVAL;

  const confidenceRange = hasValidBounds
    ? `(10-90%: ${lowerBound10.toFixed(1)}-${upperBound90.toFixed(1)}°F)`
    : undefined;

  return {
    colorClass: info.color,
    confidenceRange,
    prefix: `By end of ${year}, it could be`,
    value: info.value,
  };
}

export function getWetbulbDescription(
  wetbulbValue: number,
  measureType: string,
  year: number = GRAPH_CONFIG.YEAR_RANGE.END,
  season: GraphSeason = DEFAULT_GRAPH_SEASON,
): WetbulbDescription {
  const info = getWetbulbInfo(wetbulbValue);
  const measure = measureType === "avg" ? "average" : "max";
  const seasonLabel =
    season === DEFAULT_GRAPH_SEASON ? "annual" : season.toLowerCase();

  return {
    colorClass: info.color,
    prefix: `The ${year} ${seasonLabel} ${measure} wetbulb temperature is`,
    value: info.value,
  };
}

export function getWetbulbInfo(wetbulbValue: number): WetbulbInfo {
  const foundItem = WETBULB_INDEX_LEGEND_ITEMS.find((legendItem, index) => {
    if (legendItem.max === undefined) {
      return true;
    }
    return index === 0 ? wetbulbValue < legendItem.max : wetbulbValue <= legendItem.max;
  });

  const item = foundItem ?? WETBULB_INDEX_LEGEND_ITEMS.at(-1);

  if (!item) {
    throw new Error("Wetbulb index legend items are empty or invalid");
  }

  return buildWetbulbInfo(item, wetbulbValue);
}
