"use client";

import { ChartResponsiveContainer } from "@/components/app/chart-responsive-container";
import {
  DEFAULT_GRAPH_SEASON,
  DEFAULT_TEMPERATURE_UNIT,
  GRAPH_COLORS,
  GRAPH_CONFIG,
  type GraphSeason,
  type TemperatureUnit,
} from "@/lib/constants";
import {
  convertFromFahrenheit,
  fahrenheitDeltaToCelsius,
} from "@/lib/utils/temperature";
import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrendForecastData {
  forecastValues: number[];
  forecastYears: number[];
  lowerBound10: number[];
  upperBound90: number[];
}

interface GenerateTrendGraphOptions {
  forecastData?: TrendForecastData;
  increasePerYear: number;
  isMobileViewport?: boolean;
  option: string;
  season?: GraphSeason;
  showLegend?: boolean;
  trendlineWetbulbs: number[];
  unit?: TemperatureUnit;
  useCompactDesktopHeight?: boolean;
  yearWetbulbs: number[];
  years: number[];
}

interface GenerateReferenceGraphOptions {
  currentWetbulbs: number[];
  currentYear?: number;
  dates: Date[];
  isMobileViewport?: boolean;
  referenceWetbulbs: number[];
  referenceYear: string;
  season?: GraphSeason;
  showLegend?: boolean;
  unit?: TemperatureUnit;
}

interface ChartShellProperties {
  children?: React.ReactNode;
  emptyState: string;
  subtitle?: string;
  title: string;
  useCompactDesktopHeight?: boolean;
}

interface ChartTooltipPayload {
  color?: string;
  dataKey?: string;
  name?: string;
  payload: Record<string, unknown>;
  value?: number;
}

interface ChartTooltipProperties {
  active?: boolean;
  label?: number | string;
  payload?: ChartTooltipPayload[];
  unit: TemperatureUnit;
}

interface ReferenceChartPoint {
  currentWetbulb?: number;
  label: string;
  referenceWetbulb?: number;
  tooltipLabel: string;
}

interface TrendChartPoint {
  confidenceFloor?: number;
  confidenceHigh?: number;
  confidenceLow?: number;
  confidenceSpan?: number;
  forecast?: number;
  wetbulb?: number;
  tooltipLabel: string;
  trendline?: number;
  year: number;
}

interface ChartMarginOptions {
  isMobileViewport: boolean;
  showLegend: boolean;
}

interface GraphLegendProperties {
  showLegend: boolean;
}

interface TrendForecastSeriesProperties {
  forecastData?: TrendForecastData;
  shouldAnimate: boolean;
}

interface TrendChartBodyProperties {
  chartData: TrendChartPoint[];
  forecastData?: TrendForecastData;
  graphType: string;
  isMobileViewport: boolean;
  season: GraphSeason;
  shouldAnimate: boolean;
  showLegend: boolean;
  unit: TemperatureUnit;
}

interface ReferenceChartBodyProperties {
  chartData: ReferenceChartPoint[];
  currentYear: number;
  isMobileViewport: boolean;
  referenceYear: string;
  season: GraphSeason;
  shouldAnimate: boolean;
  showLegend: boolean;
  unit: TemperatureUnit;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const WETBULB_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 1,
});

const CHART_DOMAIN = ["dataMin", "dataMax"];
const TOOLTIP_CURSOR_STYLE = { stroke: GRAPH_COLORS.grid };
const LEGEND_WRAPPER_STYLE = { paddingTop: "0.75rem" };
const TOOLTIP_CONTAINER_STYLE = {
  background: GRAPH_COLORS.tooltipBackground,
  borderColor: GRAPH_COLORS.tooltipBorder,
};
const TICK_FONT_SIZE_MOBILE = 12;
const TICK_FONT_SIZE_DESKTOP = 13;
const DOT_RADIUS_MOBILE = 2.5;
const DOT_RADIUS_DESKTOP = 3;
const TICK_COUNT_MOBILE = 6;
const TICK_COUNT_DESKTOP = 8;
const Y_AXIS_WIDTH_MOBILE = 42;
const Y_AXIS_WIDTH_DESKTOP = 56;
const MARGIN_TOP = 8;
const MARGIN_BOTTOM_WITH_LEGEND = 4;
const MARGIN_LEFT_MOBILE = -18;
const MARGIN_LEFT_DESKTOP = -10;
const MARGIN_RIGHT_MOBILE = 4;
const MARGIN_RIGHT_DESKTOP = 12;
const MIN_TICK_GAP_REFERENCE_MOBILE = 28;
const MIN_TICK_GAP_REFERENCE_DESKTOP = 16;
const Y_AXIS_STEP = 2;
const Y_AXIS_LOWER_PADDING = 2;
const Y_AXIS_UPPER_PADDING = 1;

const getActiveDotStyle = (color: string) => ({
  fill: color,
  r: 4,
  stroke: color,
  strokeWidth: 1.5,
});

const TREND_ACTIVE_DOT = getActiveDotStyle(GRAPH_COLORS.primary);
const REF_CURRENT_ACTIVE_DOT = getActiveDotStyle(GRAPH_COLORS.primary);
const REF_REFERENCE_ACTIVE_DOT = getActiveDotStyle(GRAPH_COLORS.secondary);

const formatYAxisTick = (value: number) => `${value.toFixed(0)}°`;
const formatLegendLabel = (value: string) => (
  <span className="text-xs font-medium text-foreground/80">{value}</span>
);

const getGraphFillHeightClass = (useCompactDesktopHeight: boolean): string =>
  useCompactDesktopHeight
    ? "h-full min-h-[clamp(220px,42vh,520px)] sm:min-h-[clamp(300px,45vh,500px)]"
    : "h-full min-h-[clamp(220px,42vh,520px)] sm:min-h-[clamp(450px,70vh,850px)]";

const formatWetbulbValue = (
  value: number | undefined,
  unit: TemperatureUnit,
): string => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `${WETBULB_FORMATTER.format(value)}°${unit}`;
};

const shouldAnimateCharts = (): boolean => {
  if (typeof globalThis.matchMedia !== "function") {
    return true;
  }

  return !globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const useInitialChartAnimation = (): boolean => {
  const animationsAllowed = React.useMemo(() => shouldAnimateCharts(), []);
  const hasRenderedRef = React.useRef(false);

  React.useEffect(() => {
    hasRenderedRef.current = true;
  }, []);

  return animationsAllowed && !hasRenderedRef.current;
};

const buildReferenceChartData = (
  dates: Date[],
  currentWetbulbs: number[],
  referenceWetbulbs: number[],
): ReferenceChartPoint[] =>
  dates.map((date, index) => ({
    currentWetbulb: currentWetbulbs[index],
    label: DATE_FORMATTER.format(date),
    referenceWetbulb: referenceWetbulbs[index],
    tooltipLabel: DATE_FORMATTER.format(date),
  }));

const buildTrendChartData = (
  years: number[],
  yearWetbulbs: number[],
  trendlineWetbulbs: number[],
  forecastData?: TrendForecastData,
): TrendChartPoint[] => {
  const pointMap = new Map<number, TrendChartPoint>(
    years.map((year, index) => [
      year,
      {
        wetbulb: yearWetbulbs[index],
        tooltipLabel: String(year),
        trendline: trendlineWetbulbs[index],
        year,
      },
    ]),
  );

  if (!forecastData || forecastData.forecastYears.length === 0) {
    return [...pointMap.values()].toSorted((a, b) => a.year - b.year);
  }

  const lastHistoricalYear = years.at(-1);
  const lastHistoricalWetbulb = yearWetbulbs.at(-1);

  if (lastHistoricalYear === undefined || lastHistoricalWetbulb === undefined) {
    return [...pointMap.values()].toSorted((a, b) => a.year - b.year);
  }

  const forecastPoints: TrendChartPoint[] = [
    {
      confidenceFloor: lastHistoricalWetbulb,
      confidenceHigh: lastHistoricalWetbulb,
      confidenceLow: lastHistoricalWetbulb,
      confidenceSpan: 0,
      forecast: lastHistoricalWetbulb,
      tooltipLabel: String(lastHistoricalYear),
      year: lastHistoricalYear,
    },
    ...forecastData.forecastYears.map((year, index) => {
      const confidenceLow = forecastData.lowerBound10[index];
      const confidenceHigh = forecastData.upperBound90[index];

      return {
        confidenceFloor: confidenceLow,
        confidenceHigh,
        confidenceLow,
        confidenceSpan:
          confidenceLow !== undefined && confidenceHigh !== undefined
            ? confidenceHigh - confidenceLow
            : undefined,
        forecast: forecastData.forecastValues[index],
        tooltipLabel: String(year),
        year,
      } satisfies TrendChartPoint;
    }),
  ];

  for (const forecastPoint of forecastPoints) {
    pointMap.set(forecastPoint.year, {
      ...pointMap.get(forecastPoint.year),
      ...forecastPoint,
    });
  }

  return [...pointMap.values()].toSorted((a, b) => a.year - b.year);
};

const getChartMargin = ({
  isMobileViewport,
  showLegend,
}: ChartMarginOptions) => ({
  bottom: showLegend ? MARGIN_BOTTOM_WITH_LEGEND : 0,
  left: isMobileViewport ? MARGIN_LEFT_MOBILE : MARGIN_LEFT_DESKTOP,
  right: isMobileViewport ? MARGIN_RIGHT_MOBILE : MARGIN_RIGHT_DESKTOP,
  top: MARGIN_TOP,
});

const hasTrendGraphData = (
  years: number[],
  yearWetbulbs: number[],
  trendlineWetbulbs: number[],
): boolean =>
  years.length > 0 && yearWetbulbs.length > 0 && trendlineWetbulbs.length > 0;

const hasReferenceGraphData = (
  dates: Date[],
  currentWetbulbs: number[],
  referenceWetbulbs: number[],
): boolean =>
  dates.length > 0 && referenceWetbulbs.length > 0 && currentWetbulbs.length > 0;

const roundDownToStep = (value: number, step: number): number =>
  Math.floor(value / step) * step;

const roundUpToStep = (value: number, step: number): number =>
  Math.ceil(value / step) * step;

const getYAxisDomain = (values: (number | undefined)[]): [number, number] => {
  const numericValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (numericValues.length === 0) {
    return [0, Y_AXIS_STEP];
  }

  const dataMin = Math.min(...numericValues);
  const dataMax = Math.max(...numericValues);
  const lowerBound = roundDownToStep(
    dataMin - Y_AXIS_LOWER_PADDING,
    Y_AXIS_STEP,
  );
  const upperBound = roundUpToStep(dataMax + Y_AXIS_UPPER_PADDING, Y_AXIS_STEP);

  if (lowerBound === upperBound) {
    return [lowerBound, upperBound + Y_AXIS_STEP];
  }

  return [lowerBound, upperBound];
};

const getTrendGraphType = (option: string): string =>
  option === GRAPH_CONFIG.TREND_OPTIONS.AVG ? "Average" : "Maximum";

const formatIncreasePerYearText = (increasePerYear: number): string =>
  increasePerYear >= 0
    ? `+${increasePerYear.toFixed(2)}`
    : increasePerYear.toFixed(2);

const ChartShell = ({
  children,
  emptyState,
  subtitle,
  title,
  useCompactDesktopHeight = false,
}: ChartShellProperties): React.ReactElement => (
  <div
    className={`${getGraphFillHeightClass(useCompactDesktopHeight)} w-full min-w-0`}
  >
    <div className="flex h-full min-w-0 flex-col rounded-2xl p-3 graph-surface-panel sm:p-4">
      <div className="mb-3 space-y-1 border-b border-border/60 pb-3">
        <h3 className="text-base font-semibold text-foreground sm:text-lg">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="min-h-0 min-w-0 flex-1">
        {children ?? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/20 px-4 text-center text-sm text-muted-foreground">
            {emptyState}
          </div>
        )}
      </div>
    </div>
  </div>
);

const getTooltipColorStyle = (color?: string) => ({
  backgroundColor: color ?? GRAPH_COLORS.primary,
});

const ChartTooltip = ({
  active,
  label,
  payload,
  unit,
}: ChartTooltipProperties): React.ReactElement | null => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = (payload[0]?.payload ?? {}) as Partial<
    ReferenceChartPoint & TrendChartPoint
  >;
  const visiblePayload = payload.filter(
    (entry) =>
      typeof entry.value === "number" &&
      entry.dataKey !== "confidenceFloor" &&
      entry.dataKey !== "confidenceSpan",
  );

  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lg"
      style={TOOLTIP_CONTAINER_STYLE}
    >
      <p className="mb-2 font-semibold text-foreground">
        {point.tooltipLabel ?? String(label ?? "")}
      </p>
      <div className="space-y-1.5">
        {visiblePayload.map((entry) => (
          <div
            className="flex items-center justify-between gap-3"
            key={`${entry.dataKey}-${entry.name}`}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="inline-flex size-2 rounded-full"
                style={getTooltipColorStyle(entry.color)}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-foreground">
              {formatWetbulbValue(entry.value, unit)}
            </span>
          </div>
        ))}
      </div>
      {typeof point.confidenceLow === "number" &&
        typeof point.confidenceHigh === "number" && (
          <p className="mt-2 border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
            80% confidence interval:{" "}
            {formatWetbulbValue(point.confidenceLow, unit)} to{" "}
            {formatWetbulbValue(point.confidenceHigh, unit)}
          </p>
        )}
    </div>
  );
};

const GraphLegend = ({
  showLegend,
}: GraphLegendProperties): React.ReactElement | null => {
  if (!showLegend) {
    return null;
  }

  return (
    <Legend
      formatter={formatLegendLabel}
      iconSize={10}
      wrapperStyle={LEGEND_WRAPPER_STYLE}
    />
  );
};

const TrendForecastSeries = ({
  forecastData,
  shouldAnimate,
}: TrendForecastSeriesProperties): React.ReactElement | null => {
  if (!forecastData || forecastData.forecastYears.length === 0) {
    return null;
  }

  return (
    <>
      <Area
        activeDot={false}
        dataKey="confidenceFloor"
        fill="transparent"
        isAnimationActive={shouldAnimate}
        legendType="none"
        stackId="confidence"
        stroke="none"
      />
      <Area
        activeDot={false}
        dataKey="confidenceSpan"
        fill={GRAPH_COLORS.confidenceFill}
        isAnimationActive={shouldAnimate}
        name="80% Confidence Interval"
        stackId="confidence"
        stroke="none"
      />
      <Line
        connectNulls
        dataKey="forecast"
        dot={false}
        isAnimationActive={shouldAnimate}
        name="Forecast"
        stroke={GRAPH_COLORS.secondary}
        strokeDasharray="6 5"
        strokeWidth={2}
        type="monotone"
      />
    </>
  );
};

const TrendChartBody = ({
  chartData,
  forecastData,
  graphType,
  isMobileViewport,
  season,
  shouldAnimate,
  showLegend,
  unit,
}: TrendChartBodyProperties): React.ReactElement => {
  const yAxisDomain = React.useMemo(
    () =>
      getYAxisDomain(
        chartData.flatMap((point) => [
          point.wetbulb,
          point.trendline,
          point.forecast,
        ]),
      ),
    [chartData],
  );

  const tickStyle = React.useMemo(
    () => ({
      fill: GRAPH_COLORS.text,
      fontSize: isMobileViewport
        ? TICK_FONT_SIZE_MOBILE
        : TICK_FONT_SIZE_DESKTOP,
    }),
    [isMobileViewport],
  );

  const dotStyle = React.useMemo(
    () => ({
      fill: GRAPH_COLORS.primary,
      r: isMobileViewport ? DOT_RADIUS_MOBILE : DOT_RADIUS_DESKTOP,
    }),
    [isMobileViewport],
  );

  const tooltipContent = React.useMemo(
    () => <ChartTooltip unit={unit} />,
    [unit],
  );
  const chartMargin = React.useMemo(
    () => getChartMargin({ isMobileViewport, showLegend }),
    [isMobileViewport, showLegend],
  );

  return (
    <div
      aria-label={`${graphType} ${season} wetbulb trend chart`}
      className="size-full"
      data-testid="trend-chart"
    >
      <ChartResponsiveContainer minHeight={0} minWidth={0}>
        <ComposedChart data={chartData} margin={chartMargin}>
          <CartesianGrid
            stroke={GRAPH_COLORS.grid}
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            allowDecimals={false}
            axisLine={false}
            dataKey="year"
            domain={CHART_DOMAIN}
            minTickGap={24}
            tick={tickStyle}
            tickCount={
              isMobileViewport ? TICK_COUNT_MOBILE : TICK_COUNT_DESKTOP
            }
            tickLine={false}
            type="number"
          />
          <YAxis
            allowDataOverflow
            axisLine={false}
            domain={yAxisDomain}
            tick={tickStyle}
            tickFormatter={formatYAxisTick}
            tickLine={false}
            width={
              isMobileViewport ? Y_AXIS_WIDTH_MOBILE : Y_AXIS_WIDTH_DESKTOP
            }
          />
          <Tooltip content={tooltipContent} cursor={TOOLTIP_CURSOR_STYLE} />
          <GraphLegend showLegend={showLegend} />
          <TrendForecastSeries
            forecastData={forecastData}
            shouldAnimate={shouldAnimate}
          />
          <Line
            activeDot={TREND_ACTIVE_DOT}
            dataKey="wetbulb"
            dot={dotStyle}
            isAnimationActive={shouldAnimate}
            name="Wetbulb"
            stroke={GRAPH_COLORS.primary}
            strokeWidth={2.5}
            type="monotone"
          />
          <Line
            connectNulls
            dataKey="trendline"
            dot={false}
            isAnimationActive={shouldAnimate}
            name="Trendline of Wetbulb"
            stroke={GRAPH_COLORS.reference}
            strokeDasharray="8 5"
            strokeWidth={2}
            type="monotone"
          />
        </ComposedChart>
      </ChartResponsiveContainer>
    </div>
  );
};

const ReferenceChartBody = ({
  chartData,
  currentYear,
  isMobileViewport,
  referenceYear,
  season,
  shouldAnimate,
  showLegend,
  unit,
}: ReferenceChartBodyProperties): React.ReactElement => {
  const yAxisDomain = React.useMemo(
    () =>
      getYAxisDomain(
        chartData.flatMap((point) => [point.currentWetbulb, point.referenceWetbulb]),
      ),
    [chartData],
  );

  const tickStyle = React.useMemo(
    () => ({
      fill: GRAPH_COLORS.text,
      fontSize: isMobileViewport
        ? TICK_FONT_SIZE_MOBILE
        : TICK_FONT_SIZE_DESKTOP,
    }),
    [isMobileViewport],
  );

  const tooltipContent = React.useMemo(
    () => <ChartTooltip unit={unit} />,
    [unit],
  );
  const chartMargin = React.useMemo(
    () => getChartMargin({ isMobileViewport, showLegend }),
    [isMobileViewport, showLegend],
  );

  return (
    <div
      aria-label={`${season} wetbulb reference comparison chart`}
      className="size-full"
      data-testid="reference-chart"
    >
      <ChartResponsiveContainer minHeight={0} minWidth={0}>
        <ComposedChart data={chartData} margin={chartMargin}>
          <CartesianGrid
            stroke={GRAPH_COLORS.grid}
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={
              isMobileViewport
                ? MIN_TICK_GAP_REFERENCE_MOBILE
                : MIN_TICK_GAP_REFERENCE_DESKTOP
            }
            tick={tickStyle}
            tickLine={false}
          />
          <YAxis
            allowDataOverflow
            axisLine={false}
            domain={yAxisDomain}
            tick={tickStyle}
            tickFormatter={formatYAxisTick}
            tickLine={false}
            width={
              isMobileViewport ? Y_AXIS_WIDTH_MOBILE : Y_AXIS_WIDTH_DESKTOP
            }
          />
          <Tooltip content={tooltipContent} cursor={TOOLTIP_CURSOR_STYLE} />
          <GraphLegend showLegend={showLegend} />
          <Line
            activeDot={REF_CURRENT_ACTIVE_DOT}
            dataKey="currentWetbulb"
            dot={false}
            isAnimationActive={shouldAnimate}
            name={`Current year (${currentYear})`}
            stroke={GRAPH_COLORS.primary}
            strokeWidth={3}
            type="linear"
          />
          <Line
            activeDot={REF_REFERENCE_ACTIVE_DOT}
            dataKey="referenceWetbulb"
            dot={false}
            isAnimationActive={shouldAnimate}
            name={`Reference year (${referenceYear})`}
            stroke={GRAPH_COLORS.secondary}
            strokeDasharray="12 7"
            strokeWidth={2.5}
            type="linear"
          />
        </ComposedChart>
      </ChartResponsiveContainer>
    </div>
  );
};

const convertForecastData = (
  forecastData: TrendForecastData | undefined,
  unit: TemperatureUnit,
): TrendForecastData | undefined =>
  forecastData && {
    forecastValues: forecastData.forecastValues.map((value) =>
      convertFromFahrenheit(value, unit),
    ),
    forecastYears: forecastData.forecastYears,
    lowerBound10: forecastData.lowerBound10.map((value) =>
      convertFromFahrenheit(value, unit),
    ),
    upperBound90: forecastData.upperBound90.map((value) =>
      convertFromFahrenheit(value, unit),
    ),
  };

export const GenerateTrendGraph = ({
  forecastData,
  increasePerYear,
  isMobileViewport = false,
  option,
  season = DEFAULT_GRAPH_SEASON,
  showLegend = true,
  trendlineWetbulbs,
  unit = DEFAULT_TEMPERATURE_UNIT,
  useCompactDesktopHeight = false,
  yearWetbulbs,
  years,
}: GenerateTrendGraphOptions): React.ReactElement => {
  const shouldAnimate = useInitialChartAnimation();

  if (!hasTrendGraphData(years, yearWetbulbs, trendlineWetbulbs)) {
    return (
      <ChartShell
        emptyState="No data available for the selected parameters."
        subtitle="Try a different measure or season."
        title="Trend analysis"
        useCompactDesktopHeight={useCompactDesktopHeight}
      />
    );
  }

  const convertedForecastData = convertForecastData(forecastData, unit);
  const chartData = buildTrendChartData(
    years,
    yearWetbulbs.map((value) => convertFromFahrenheit(value, unit)),
    trendlineWetbulbs.map((value) => convertFromFahrenheit(value, unit)),
    convertedForecastData,
  );

  const graphType = getTrendGraphType(option);
  const startYear = years.at(0) ?? GRAPH_CONFIG.YEAR_RANGE.START;
  const endYear = years.at(-1) ?? GRAPH_CONFIG.YEAR_RANGE.END;
  const increasePerYearInUnit =
    unit === "C" ? fahrenheitDeltaToCelsius(increasePerYear) : increasePerYear;
  const increaseText = formatIncreasePerYearText(increasePerYearInUnit);

  return (
    <ChartShell
      emptyState="No data available for the selected parameters."
      subtitle={`${startYear}–${endYear} · Increase per year: ${increaseText}°${unit}`}
      title={`${graphType} ${season} Wetbulb`}
      useCompactDesktopHeight={useCompactDesktopHeight}
    >
      <TrendChartBody
        chartData={chartData}
        forecastData={convertedForecastData}
        graphType={graphType}
        isMobileViewport={isMobileViewport}
        season={season}
        shouldAnimate={shouldAnimate}
        showLegend={showLegend}
        unit={unit}
      />
    </ChartShell>
  );
};

export const GenerateReferenceGraph = ({
  currentWetbulbs,
  currentYear = GRAPH_CONFIG.YEAR_RANGE.END,
  dates,
  isMobileViewport = false,
  referenceWetbulbs,
  referenceYear,
  season = DEFAULT_GRAPH_SEASON,
  showLegend = true,
  unit = DEFAULT_TEMPERATURE_UNIT,
}: GenerateReferenceGraphOptions): React.ReactElement => {
  const shouldAnimate = useInitialChartAnimation();

  if (!hasReferenceGraphData(dates, currentWetbulbs, referenceWetbulbs)) {
    return (
      <ChartShell
        emptyState="No data available for the selected parameters."
        subtitle="Try a different reference year."
        title="Reference comparison"
      />
    );
  }

  const chartData = buildReferenceChartData(
    dates,
    currentWetbulbs.map((value) => convertFromFahrenheit(value, unit)),
    referenceWetbulbs.map((value) => convertFromFahrenheit(value, unit)),
  );

  return (
    <ChartShell
      emptyState="No data available for the selected parameters."
      title={`${season} Wetbulb in ${currentYear} vs ${referenceYear}`}
    >
      <ReferenceChartBody
        chartData={chartData}
        currentYear={currentYear}
        isMobileViewport={isMobileViewport}
        referenceYear={referenceYear}
        season={season}
        shouldAnimate={shouldAnimate}
        showLegend={showLegend}
        unit={unit}
      />
    </ChartShell>
  );
};
