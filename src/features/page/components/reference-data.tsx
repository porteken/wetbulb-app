"use client";

import { ChartSkeleton } from "@/components/app/chart-skeleton";
import { ErrorGraphDisplay } from "@/features/home/components/error-graph-display";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { getReferenceGraphQueryOptions } from "@/lib/api/query-client";
import { DEFAULT_GRAPH_SEASON, GRAPH_CONFIG } from "@/lib/constants";
import { YearOptions } from "@/lib/utils/select-options";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import React from "react";

interface ReferenceDataProperties {
  CurrentDates: Date[];
  CurrentWetbulbs: number[];
  id: number;
  initialHasError?: boolean;
  initialReferenceYear: string;
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

const ReferenceDataComponent: React.FC<ReferenceDataProperties> = ({
  CurrentDates,
  CurrentWetbulbs,
  id,
  initialHasError = false,
  initialReferenceYear,
  onReferenceYearChange,
  referenceYear,
  ReferenceWetbulbs,
}) => {
  const REFERENCE_YEARS = React.useMemo(
    () => YearOptions({ includeLatestYear: false }),
    [],
  );
  const isMobileViewport = useIsMobileViewport();
  const [isMobileLegendOpen, setIsMobileLegendOpen] = React.useState(false);

  const showReferenceLegend = !isMobileViewport || isMobileLegendOpen;

  const initialReferenceData = React.useMemo(() => {
    const hasValidInitialData =
      CurrentDates.length > 0 &&
      CurrentWetbulbs.length === CurrentDates.length &&
      ReferenceWetbulbs.length === CurrentDates.length;

    return hasValidInitialData
      ? { dates: CurrentDates, wetbulbs: ReferenceWetbulbs }
      : undefined;
  }, [CurrentDates, CurrentWetbulbs.length, ReferenceWetbulbs]);

  const referenceQuery = useQuery({
    ...getReferenceGraphQueryOptions(id, referenceYear),
    initialData:
      referenceYear === initialReferenceYear ? initialReferenceData : undefined,
  });

  const referenceGraphSnapshot = referenceQuery.data;
  const hasReferenceError =
    referenceQuery.isError || (initialHasError && !referenceQuery.data);
  const referencePointCount = referenceGraphSnapshot?.dates.length ?? 0;
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
          {(() => {
            if (referenceGraphSnapshot) {
              return (
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                  <div
                    aria-label="Scrollable reference graph"
                    className="-mx-4 min-h-0 min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-hidden px-4 pb-2 sm:mx-0 sm:px-0"
                    data-testid="reference-graph-scroll-region"
                  >
                    <div className="h-full min-w-full" style={containerStyle}>
                      <GenerateReferenceGraph
                        currentWetbulbs={CurrentWetbulbs}
                        currentYear={
                          CurrentDates.at(-1)?.getUTCFullYear() ??
                          GRAPH_CONFIG.YEAR_RANGE.END
                        }
                        dates={referenceGraphSnapshot.dates}
                        isMobileViewport={isMobileViewport}
                        referenceWetbulbs={referenceGraphSnapshot.wetbulbs}
                        referenceYear={referenceYear}
                        season={DEFAULT_GRAPH_SEASON}
                        showLegend={showReferenceLegend}
                      />
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-(--graph-surface) to-transparent sm:hidden"
                  />
                </div>
              );
            }

            if (hasReferenceError) {
              return (
                <ErrorGraphDisplay message="Unable to load reference data" />
              );
            }

            return <ChartSkeleton />;
          })()}
        </div>
      </div>
    </div>
  );
};

ReferenceDataComponent.displayName = "ReferenceData";

export const ReferenceData = React.memo(ReferenceDataComponent);
