"use client";

import { ChartSkeleton } from "@/components/app/chart-skeleton";
import { ForecastControls } from "@/components/app/forecast-controls";
import { useTemperatureUnit } from "@/components/app/unit-provider";
import { ErrorGraphDisplay } from "@/features/home/components/error-graph-display";
import { useForecastData } from "@/features/home/hooks/use-forecast-data";
import { useTrendGraphData } from "@/features/home/hooks/use-trend-graph-data";
import { useIgnorePersistenceError } from "@/hooks/use-ignore-persistence-error";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { setForecastPreferences } from "@/lib/actions/actions";
import { normalizeGraphSeason, type GraphSeason } from "@/lib/constants";
import {
  deriveTrendAnalysis,
  type ForecastGraphData,
} from "@/lib/utils/trend-analysis";
import dynamic from "next/dynamic";
import React from "react";

import type { TrendGraphDataProperties } from "@/types/types";

interface TrendAnalysisProperties {
  graphSeason: GraphSeason;
  id: number;
  initialForecastData?: ForecastGraphData;
  initialForecastEnabled: boolean;
  initialForecastYearsAhead: number;
  initialGraphMeasure: string;
  initialGraphSeason: GraphSeason;
  initialIncreasePerYear?: number;
  initialTrendlineWetbulbs?: number[];
  initialYearWetbulbs?: number[];
  initialYears?: number[];
  onMeasureChange: (measure: string) => Promise<void>;
  onSeasonChange: (season: GraphSeason) => Promise<void>;
}

const DEFAULT_INITIAL_TRENDLINE_WETBULBS: number[] = [];
const DEFAULT_INITIAL_YEAR_WETBULBS: number[] = [];
const DEFAULT_INITIAL_YEARS: number[] = [];

const GenerateTrendGraph = dynamic(
  async () => {
    const graphModule = await import("@/features/graph");
    return graphModule.GenerateTrendGraph;
  },
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
);

interface ForecastSelectionMatchOptions {
  forecastEnabled: boolean;
  forecastYearsAhead: number;
  initialForecastEnabled: boolean;
  initialForecastYearsAhead: number;
  matchesInitialGraphSelection: boolean;
}

// The SSR-provided initialForecastData is only valid to seed the forecast
// query when every preference it was fetched with still matches selection.
const matchesInitialForecastSelection = ({
  forecastEnabled,
  forecastYearsAhead,
  initialForecastEnabled,
  initialForecastYearsAhead,
  matchesInitialGraphSelection,
}: ForecastSelectionMatchOptions): boolean =>
  matchesInitialGraphSelection &&
  forecastEnabled === initialForecastEnabled &&
  forecastYearsAhead === initialForecastYearsAhead;

const TrendAnalysisComponent: React.FC<TrendAnalysisProperties> = ({
  graphSeason,
  id,
  initialForecastData,
  initialForecastEnabled,
  initialForecastYearsAhead,
  initialGraphMeasure,
  initialGraphSeason,
  initialIncreasePerYear = 0,
  initialTrendlineWetbulbs = DEFAULT_INITIAL_TRENDLINE_WETBULBS,
  initialYearWetbulbs = DEFAULT_INITIAL_YEAR_WETBULBS,
  initialYears = DEFAULT_INITIAL_YEARS,
  onMeasureChange,
  onSeasonChange,
}) => {
  const initialTrendData = React.useMemo<
    TrendGraphDataProperties | undefined
  >(() => {
    const hasValidInitialData =
      initialYears.length > 0 &&
      initialYearWetbulbs.length === initialYears.length &&
      initialTrendlineWetbulbs.length === initialYears.length;

    return hasValidInitialData
      ? {
          increase_per_year: initialIncreasePerYear,
          trendline_wetbulbs: initialTrendlineWetbulbs,
          year_wetbulbs: initialYearWetbulbs,
          years: initialYears,
        }
      : undefined;
  }, [
    initialIncreasePerYear,
    initialTrendlineWetbulbs,
    initialYearWetbulbs,
    initialYears,
  ]);
  const [selectedGraphMeasure, setSelectedGraphMeasure] =
    React.useState(initialGraphMeasure);
  const [forecastEnabled, setForecastEnabled] = React.useState(
    () => initialForecastEnabled,
  );
  const [forecastYearsAhead, setForecastYearsAhead] = React.useState(
    () => initialForecastYearsAhead,
  );
  const isMobileViewport = useIsMobileViewport();
  const [isMobileLegendOpen, setIsMobileLegendOpen] = React.useState(false);
  const ignorePersistenceError = useIgnorePersistenceError();
  const { unit } = useTemperatureUnit();

  const showTrendLegend = !isMobileViewport || isMobileLegendOpen;

  const matchesInitialGraphSelection =
    selectedGraphMeasure === initialGraphMeasure &&
    graphSeason === initialGraphSeason;

  const trendQuery = useTrendGraphData({
    initialData: matchesInitialGraphSelection ? initialTrendData : undefined,
    locationId: id,
    option: selectedGraphMeasure,
    season: graphSeason,
  });
  const forecastQuery = useForecastData({
    enabled: forecastEnabled,
    initialData: matchesInitialForecastSelection({
      forecastEnabled,
      forecastYearsAhead,
      initialForecastEnabled,
      initialForecastYearsAhead,
      matchesInitialGraphSelection,
    })
      ? initialForecastData
      : undefined,
    locationId: id,
    option: selectedGraphMeasure,
    season: graphSeason,
    yearsAhead: forecastYearsAhead,
  });

  const {
    forecastWetbulbLevel,
    wetbulbDescription: currentWetbulbDescription,
    trendGraphSnapshot,
  } = React.useMemo(() => {
    if (!trendQuery.data) {
      return {
        forecastWetbulbLevel: undefined,
        wetbulbDescription: undefined,
        trendGraphSnapshot: undefined,
      };
    }

    const result = deriveTrendAnalysis(
      trendQuery.data,
      forecastQuery.data,
      selectedGraphMeasure,
      { season: graphSeason, unit },
    );

    return {
      forecastWetbulbLevel: result.forecastWetbulbLevel,
      wetbulbDescription: result.wetbulbDescription,
      trendGraphSnapshot: result.snapshot,
    };
  }, [
    trendQuery.data,
    forecastQuery.data,
    selectedGraphMeasure,
    graphSeason,
    unit,
  ]);
  const hasTrendError = trendQuery.isError;

  const handleGraphMeasureChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const option = event.target.value;
      setIsMobileLegendOpen(false);
      setSelectedGraphMeasure(option);
      ignorePersistenceError(onMeasureChange(option));
    },
    [onMeasureChange, ignorePersistenceError],
  );

  const handleSeasonChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const season = normalizeGraphSeason(event.target.value);
      setIsMobileLegendOpen(false);

      ignorePersistenceError(onSeasonChange(season));
    },
    [onSeasonChange, ignorePersistenceError],
  );

  const handleForecastToggle = React.useCallback(
    (enabled: boolean) => {
      setForecastEnabled(enabled);
      ignorePersistenceError(
        setForecastPreferences(enabled, forecastYearsAhead),
      );
    },
    [forecastYearsAhead, ignorePersistenceError],
  );

  const handleForecastYearsChange = React.useCallback(
    (yearsAhead: number) => {
      setForecastYearsAhead(yearsAhead);
      ignorePersistenceError(
        setForecastPreferences(forecastEnabled, yearsAhead),
      );
    },
    [forecastEnabled, ignorePersistenceError],
  );

  const handleToggleMobileLegend = React.useCallback(() => {
    setIsMobileLegendOpen((previous) => !previous);
  }, []);

  return (
    <div className="h-full min-h-0 min-w-0">
      <div className="flex h-full min-h-0 min-w-0 fade-in-up flex-col rounded-3xl p-4 glass-panel sm:px-5 sm:py-6">
        <h2 className="sr-only">Trend Analysis</h2>
        <div className="mb-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-2 block text-sm font-medium text-foreground"
                htmlFor="graph-season"
              >
                Season
              </label>
              <select
                className="h-11 w-full rounded-xl border border-border bg-background/80 px-3 text-foreground shadow-sm transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="graph-season"
                onChange={handleSeasonChange}
                value={graphSeason}
              >
                <option value="Annual">Annual</option>
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
                <option value="Winter">Winter</option>
              </select>
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-foreground"
                htmlFor="graph-measure"
              >
                Graph Measure
              </label>
              <select
                className="h-11 w-full rounded-xl border border-border bg-background/80 px-3 text-foreground shadow-sm transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="graph-measure"
                onChange={handleGraphMeasureChange}
                value={selectedGraphMeasure}
              >
                <option key="measure-avg" value="avg">
                  Average
                </option>
                <option key="measure-max" value="max">
                  Maximum
                </option>
              </select>
            </div>
          </div>
          <ForecastControls
            enabled={forecastEnabled}
            onToggle={handleForecastToggle}
            onYearsChange={handleForecastYearsChange}
            yearsAhead={forecastYearsAhead}
          />
        </div>
        {currentWetbulbDescription && (
          <div className="mb-5 rounded-2xl p-4 glass-panel-muted">
            <p className="text-sm font-medium text-foreground">
              {currentWetbulbDescription.prefix}{" "}
              <span
                className={`font-bold ${currentWetbulbDescription.colorClass}`}
              >
                {currentWetbulbDescription.value}
              </span>
            </p>
            {forecastEnabled && forecastWetbulbLevel && (
              <p className="mt-2 text-sm font-medium text-foreground">
                {forecastWetbulbLevel.prefix}{" "}
                <span
                  className={`font-bold ${forecastWetbulbLevel.colorClass}`}
                >
                  {forecastWetbulbLevel.value}
                </span>
                {forecastWetbulbLevel.confidenceRange && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {forecastWetbulbLevel.confidenceRange}
                  </span>
                )}
              </p>
            )}
          </div>
        )}
        <div className="mb-3 sm:hidden">
          <button
            aria-controls="trend-analysis-graph"
            aria-expanded={isMobileLegendOpen}
            className="rounded-full border border-border bg-background/80 px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent"
            onClick={handleToggleMobileLegend}
            type="button"
          >
            {isMobileLegendOpen ? "Hide Graph Legend" : "Show Graph Legend"}
          </button>
        </div>
        <div
          className="min-h-[clamp(220px,42vh,520px)] min-w-0 flex-1 overflow-hidden sm:min-h-[clamp(450px,70vh,850px)]"
          id="trend-analysis-graph"
        >
          {(() => {
            if (trendGraphSnapshot) {
              return (
                <GenerateTrendGraph
                  forecastData={trendGraphSnapshot.forecastData}
                  increasePerYear={trendGraphSnapshot.increase_per_year}
                  isMobileViewport={isMobileViewport}
                  option={trendGraphSnapshot.option}
                  season={trendGraphSnapshot.season}
                  showLegend={showTrendLegend}
                  trendlineWetbulbs={trendGraphSnapshot.trendline_wetbulbs}
                  unit={unit}
                  yearWetbulbs={trendGraphSnapshot.year_wetbulbs}
                  years={trendGraphSnapshot.years}
                />
              );
            }

            if (hasTrendError) {
              return <ErrorGraphDisplay message="Unable to load trend data" />;
            }

            return <ChartSkeleton />;
          })()}
        </div>
      </div>
    </div>
  );
};

TrendAnalysisComponent.displayName = "TrendAnalysis";

export const TrendAnalysis = React.memo(TrendAnalysisComponent);
