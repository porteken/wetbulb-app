"use client";

import { useWetbulbBasis } from "@/components/app/basis-provider";
import { ChartSkeleton } from "@/components/app/chart-skeleton";
import { useTemperatureUnit } from "@/components/app/unit-provider";
import { ErrorGraphDisplay } from "@/features/home/components/error-graph-display";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { alignReferenceGraphData } from "@/lib/api/graph-data";
import { getReferenceGraphQueryOptions } from "@/lib/api/query-client";
import {
  DEFAULT_GRAPH_SEASON,
  GRAPH_CONFIG,
  type WetbulbBasis,
} from "@/lib/constants";
import { YearOptions } from "@/lib/utils/select-options";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import React from "react";

interface ReferenceDataProperties {
  CurrentDates: Date[];
  CurrentWetbulbs: number[];
  earliestYear: number;
  id: number;
  initialHasError?: boolean;
  initialReferenceYear: string;
  initialWetbulbBasis: WetbulbBasis;
  onReferenceYearChange: (referenceYear: string) => void;
  referenceYear: string;
  ReferenceWetbulbs: number[];
}

const REFERENCE_SCROLL_HINT_THRESHOLD = 90;
const REFERENCE_MIN_CHART_WIDTH_MOBILE = 840;
const REFERENCE_MIN_CHART_WIDTH_DESKTOP = 1120;
const REFERENCE_POINT_WIDTH_MOBILE = 3.5;
const REFERENCE_POINT_WIDTH_DESKTOP = 4.5;

const GenerateReferenceGraph = dynamic(
  async () => {
    const graphModule = await import("@/features/graph");
    return graphModule.GenerateReferenceGraph;
  },
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
);

const shouldShowLegend = (
  isMobileViewport: boolean,
  isMobileLegendOpen: boolean,
) => !isMobileViewport || isMobileLegendOpen;

const hasCompleteInitialData = (
  dates: Date[],
  currentWetbulbs: number[],
  referenceWetbulbs: number[],
) =>
  dates.length > 0 &&
  currentWetbulbs.length === dates.length &&
  referenceWetbulbs.length === dates.length;

const selectCurrentWetbulbs = (
  alignedSnapshot: ReturnType<typeof alignReferenceGraphData> | undefined,
  currentSnapshot: { wetbulbs: number[] } | undefined,
  initialWetbulbs: number[],
) => alignedSnapshot?.wetbulbs ?? currentSnapshot?.wetbulbs ?? initialWetbulbs;

interface ReferenceGraphContentProperties {
  alignedSnapshot?: ReturnType<typeof alignReferenceGraphData>;
  containerStyle: React.CSSProperties;
  currentWetbulbs: number[];
  hasError: boolean;
  isMobileViewport: boolean;
  referenceSnapshot?: { dates: Date[]; wetbulbs: number[] };
  referenceYear: string;
  showLegend: boolean;
  unit: React.ComponentProps<typeof GenerateReferenceGraph>["unit"];
}

const ReferenceGraphContent = ({
  alignedSnapshot,
  containerStyle,
  currentWetbulbs,
  hasError,
  isMobileViewport,
  referenceSnapshot,
  referenceYear,
  showLegend,
  unit,
}: ReferenceGraphContentProperties) => {
  if (!referenceSnapshot) {
    return hasError ? (
      <ErrorGraphDisplay message="Unable to load reference data" />
    ) : (
      <ChartSkeleton />
    );
  }

  const graphDates = alignedSnapshot?.dates ?? referenceSnapshot.dates;
  const graphReferenceWetbulbs =
    alignedSnapshot?.referenceWetbulbs ?? referenceSnapshot.wetbulbs;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        aria-label="Scrollable reference graph"
        className="-mx-4 min-h-0 min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-hidden px-4 pb-2 sm:mx-0 sm:px-0"
        data-testid="reference-graph-scroll-region"
      >
        <div className="h-full min-w-full" style={containerStyle}>
          <GenerateReferenceGraph
            currentWetbulbs={currentWetbulbs}
            currentYear={GRAPH_CONFIG.YEAR_RANGE.END}
            dates={graphDates}
            isMobileViewport={isMobileViewport}
            referenceWetbulbs={graphReferenceWetbulbs}
            referenceYear={referenceYear}
            season={DEFAULT_GRAPH_SEASON}
            showLegend={showLegend}
            unit={unit}
          />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-(--graph-surface) to-transparent sm:hidden"
      />
    </div>
  );
};

const ReferenceDataComponent: React.FC<ReferenceDataProperties> = ({
  CurrentDates,
  CurrentWetbulbs,
  earliestYear,
  id,
  initialHasError = false,
  initialReferenceYear,
  initialWetbulbBasis,
  onReferenceYearChange,
  referenceYear,
  ReferenceWetbulbs,
}) => {
  const REFERENCE_YEARS = React.useMemo(
    () =>
      YearOptions({
        includeLatestYear: false,
        startYear: earliestYear,
      }),
    [earliestYear],
  );
  const isMobileViewport = useIsMobileViewport();
  const [isMobileLegendOpen, setIsMobileLegendOpen] = React.useState(false);
  const { unit } = useTemperatureUnit();
  const { basis } = useWetbulbBasis();

  const showReferenceLegend = shouldShowLegend(
    isMobileViewport,
    isMobileLegendOpen,
  );

  const currentYearKey = String(GRAPH_CONFIG.YEAR_RANGE.END);

  const hasValidInitialData = hasCompleteInitialData(
    CurrentDates,
    CurrentWetbulbs,
    ReferenceWetbulbs,
  );
  const isInitialBasis = basis === initialWetbulbBasis;

  const initialReferenceData = React.useMemo(
    () =>
      hasValidInitialData
        ? { dates: CurrentDates, wetbulbs: ReferenceWetbulbs }
        : undefined,
    [hasValidInitialData, CurrentDates, ReferenceWetbulbs],
  );

  const initialCurrentData = React.useMemo(
    () =>
      hasValidInitialData
        ? { dates: CurrentDates, wetbulbs: CurrentWetbulbs }
        : undefined,
    [hasValidInitialData, CurrentDates, CurrentWetbulbs],
  );

  const referenceQuery = useQuery({
    ...getReferenceGraphQueryOptions(
      id,
      referenceYear,
      DEFAULT_GRAPH_SEASON,
      basis,
    ),
    initialData:
      referenceYear === initialReferenceYear && isInitialBasis
        ? initialReferenceData
        : undefined,
  });

  const currentQuery = useQuery({
    ...getReferenceGraphQueryOptions(
      id,
      currentYearKey,
      DEFAULT_GRAPH_SEASON,
      basis,
    ),
    initialData: isInitialBasis ? initialCurrentData : undefined,
  });

  const referenceGraphSnapshot = referenceQuery.data;
  const currentGraphSnapshot = currentQuery.data;
  const alignedGraphSnapshot = React.useMemo(
    () =>
      currentGraphSnapshot && referenceGraphSnapshot
        ? alignReferenceGraphData(currentGraphSnapshot, referenceGraphSnapshot)
        : undefined,
    [currentGraphSnapshot, referenceGraphSnapshot],
  );
  const currentWetbulbs = selectCurrentWetbulbs(
    alignedGraphSnapshot,
    currentGraphSnapshot,
    CurrentWetbulbs,
  );
  const hasReferenceError =
    referenceQuery.isError || (initialHasError && !referenceQuery.data);
  const referencePointCount =
    alignedGraphSnapshot?.dates.length ??
    referenceGraphSnapshot?.dates.length ??
    0;
  const needsHorizontalScroll =
    referencePointCount >= REFERENCE_SCROLL_HINT_THRESHOLD;
  const referenceChartMinWidth = React.useMemo(() => {
    if (!needsHorizontalScroll) {
      return 0;
    }

    const minimumWidth = isMobileViewport
      ? REFERENCE_MIN_CHART_WIDTH_MOBILE
      : REFERENCE_MIN_CHART_WIDTH_DESKTOP;
    const pointWidth = isMobileViewport
      ? REFERENCE_POINT_WIDTH_MOBILE
      : REFERENCE_POINT_WIDTH_DESKTOP;

    return Math.max(minimumWidth, Math.round(referencePointCount * pointWidth));
  }, [isMobileViewport, needsHorizontalScroll, referencePointCount]);

  const containerStyle = React.useMemo(
    () => ({ minWidth: `${referenceChartMinWidth}px` }),
    [referenceChartMinWidth],
  );

  const handleReferenceYearChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const year = event.target.value;
      setIsMobileLegendOpen(false);
      onReferenceYearChange(year);
    },
    [onReferenceYearChange],
  );

  const handleToggleMobileLegend = React.useCallback(() => {
    setIsMobileLegendOpen((previous) => !previous);
  }, []);

  return (
    <div className="h-full min-h-0 min-w-0">
      <div className="flex h-full min-h-0 min-w-0 fade-in-up flex-col rounded-3xl p-4 glass-panel sm:px-5 sm:py-6">
        <h2 className="sr-only">Reference Data</h2>
        <div className="mb-5 space-y-4">
          <label
            className="mb-2 block text-sm font-medium text-foreground"
            htmlFor="reference-year"
          >
            Reference Year
          </label>
          <select
            className="h-11 w-full rounded-xl border border-border bg-background/80 px-3 text-foreground shadow-sm transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="reference-year"
            onChange={handleReferenceYearChange}
            value={referenceYear}
          >
            {REFERENCE_YEARS.map((option) => (
              <option key={`year-${option.key}`} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3 sm:hidden">
          <button
            aria-controls="reference-data-graph"
            aria-expanded={isMobileLegendOpen}
            className="rounded-full border border-border bg-background/80 px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent"
            onClick={handleToggleMobileLegend}
            type="button"
          >
            {isMobileLegendOpen ? "Hide Graph Legend" : "Show Graph Legend"}
          </button>
        </div>
        <div
          className="flex min-h-[clamp(220px,42vh,520px)] min-w-0 flex-1 flex-col overflow-hidden sm:min-h-[clamp(450px,70vh,850px)]"
          id="reference-data-graph"
        >
          <ReferenceGraphContent
            alignedSnapshot={alignedGraphSnapshot}
            containerStyle={containerStyle}
            currentWetbulbs={currentWetbulbs}
            hasError={hasReferenceError}
            isMobileViewport={isMobileViewport}
            referenceSnapshot={referenceGraphSnapshot}
            referenceYear={referenceYear}
            showLegend={showReferenceLegend}
            unit={unit}
          />
        </div>
      </div>
    </div>
  );
};

ReferenceDataComponent.displayName = "ReferenceData";

export const ReferenceData = React.memo(ReferenceDataComponent);
