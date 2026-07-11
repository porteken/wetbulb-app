import {
  DEFAULT_GRAPH_SEASON,
  DEFAULT_TEMPERATURE_UNIT,
  GRAPH_CONFIG,
  type GraphSeason,
  type TemperatureUnit,
} from "@/lib/constants";
import { convertFromCelsius } from "@/lib/utils/temperature";

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
  /** Upper bound in °C — the DB stores wetbulb values in Celsius, so
   * classification always compares against this, regardless of display unit. */
  max?: number;
  /** Clean Fahrenheit range label — sourced independently from the °C
   * thresholds (rounded to the nearest °F), not derived from `max` at
   * render time, to avoid rounding drift. */
  rangeLabelC: string;
  rangeLabelF: string;
}

export const WETBULB_INDEX_LEGEND_ITEMS: readonly WetbulbIndexLegendItem[] = [
  {
    colorClass: "text-green-600",
    fillClass: "bg-green-500",
    level: "None",
    max: 20,
    rangeLabelC: "< 20°C",
    rangeLabelF: "< 68°F",
  },
  {
    colorClass: "text-yellow-600",
    fillClass: "bg-yellow-400",
    level: "Low Risk",
    max: 24,
    rangeLabelC: "20–24°C",
    rangeLabelF: "68–76°F",
  },
  {
    colorClass: "text-amber-600",
    fillClass: "bg-amber-500",
    level: "Moderate Risk",
    max: 26,
    rangeLabelC: "25–26°C",
    rangeLabelF: "77–80°F",
  },
  {
    colorClass: "text-orange-600",
    fillClass: "bg-orange-500",
    level: "High Risk",
    max: 28,
    rangeLabelC: "27–28°C",
    rangeLabelF: "81–83°F",
  },
  {
    colorClass: "text-red-600",
    fillClass: "bg-red-500",
    level: "Extreme Risk",
    max: 30,
    rangeLabelC: "29–30°C",
    rangeLabelF: "84–87°F",
  },
  {
    colorClass: "text-red-800",
    fillClass: "bg-red-700",
    level: "Empirical Limit",
    max: 34,
    rangeLabelC: "31–34°C",
    rangeLabelF: "88–94°F",
  },
  {
    colorClass: "text-purple-800",
    fillClass: "bg-purple-700",
    level: "Theoretical Limit",
    rangeLabelC: "≥ 35°C",
    rangeLabelF: "≥ 95°F",
  },
];

export const getWetbulbRangeLabel = (
  item: Pick<WetbulbIndexLegendItem, "rangeLabelC" | "rangeLabelF">,
  unit: TemperatureUnit,
): string => (unit === "C" ? item.rangeLabelC : item.rangeLabelF);

interface WetbulbInfo {
  color: string;
  level: WetbulbIndexLevel;
  value: string;
}

const MIN_CONFIDENCE_INTERVAL = 0.1;

function buildWetbulbInfo(
  item: WetbulbIndexLegendItem,
  wetbulbValueCelsius: number,
  unit: TemperatureUnit,
): WetbulbInfo {
  return {
    color: item.colorClass,
    level: item.level,
    value: `${convertFromCelsius(wetbulbValueCelsius, unit).toFixed(1)}°${unit}`,
  };
}

export interface ForecastWetbulbDescriptionOptions {
  lowerBound10?: number;
  unit?: TemperatureUnit;
  upperBound90?: number;
}

export function getForecastWetbulbDescription(
  wetbulbValueCelsius: number,
  year: number,
  options: ForecastWetbulbDescriptionOptions = {},
): WetbulbDescription {
  const {
    lowerBound10,
    unit = DEFAULT_TEMPERATURE_UNIT,
    upperBound90,
  } = options;
  const info = getWetbulbInfo(wetbulbValueCelsius, unit);

  const hasValidBounds =
    lowerBound10 !== undefined &&
    upperBound90 !== undefined &&
    !Number.isNaN(lowerBound10) &&
    !Number.isNaN(upperBound90) &&
    Math.abs(upperBound90 - lowerBound10) > MIN_CONFIDENCE_INTERVAL;

  const confidenceRange = hasValidBounds
    ? `(10-90%: ${convertFromCelsius(lowerBound10, unit).toFixed(1)}-${convertFromCelsius(upperBound90, unit).toFixed(1)}°${unit})`
    : undefined;

  return {
    colorClass: info.color,
    confidenceRange,
    prefix: `By end of ${year}, it could be`,
    value: info.value,
  };
}

export interface WetbulbDescriptionOptions {
  season?: GraphSeason;
  unit?: TemperatureUnit;
  year?: number;
}

export function getWetbulbDescription(
  wetbulbValueCelsius: number,
  measureType: string,
  options: WetbulbDescriptionOptions = {},
): WetbulbDescription {
  const {
    season = DEFAULT_GRAPH_SEASON,
    unit = DEFAULT_TEMPERATURE_UNIT,
    year = GRAPH_CONFIG.YEAR_RANGE.END,
  } = options;
  const info = getWetbulbInfo(wetbulbValueCelsius, unit);
  const measure = measureType === "avg" ? "average" : "max";
  const seasonLabel =
    season === DEFAULT_GRAPH_SEASON ? "annual" : season.toLowerCase();

  return {
    colorClass: info.color,
    prefix: `The ${year} ${seasonLabel} ${measure} wetbulb temperature is`,
    value: info.value,
  };
}

export function getWetbulbInfo(
  wetbulbValueCelsius: number,
  unit: TemperatureUnit = DEFAULT_TEMPERATURE_UNIT,
): WetbulbInfo {
  const foundItem = WETBULB_INDEX_LEGEND_ITEMS.find((legendItem, index) => {
    if (legendItem.max === undefined) {
      return true;
    }
    return index === 0
      ? wetbulbValueCelsius < legendItem.max
      : wetbulbValueCelsius <= legendItem.max;
  });

  const item = foundItem ?? WETBULB_INDEX_LEGEND_ITEMS.at(-1);

  if (!item) {
    throw new Error("Wetbulb index legend items are empty or invalid");
  }

  return buildWetbulbInfo(item, wetbulbValueCelsius, unit);
}
