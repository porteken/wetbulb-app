import { AppSelect as Select } from "@/components/app/app-select";
import { ForecastControls } from "@/components/app/forecast-controls";
import { Button } from "@/components/ui/button";
import {
  GRAPH_CONFIG,
  type GraphSeason,
  normalizeGraphSeason,
  type TemperatureUnit,
} from "@/lib/constants";
import { isCurrentYearTrendAvailable } from "@/lib/utils/season-availability";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { memo, useCallback } from "react";

import { ErrorGraphDisplay } from "./error-graph-display";

import type { TrendGraphSnapshot } from "@/lib/utils/trend-analysis";
import type { WetbulbDescription } from "@/lib/utils/wetbulb-index";

interface GraphSectionProperties {
  forecastEnabled: boolean;
  forecastWetbulbLevel?: WetbulbDescription;
  forecastYearsAhead: number;
  graphHasError?: boolean;
  graphLoading: boolean;
  wetbulbDescription?: WetbulbDescription;
  isMobileGraphLegendOpen?: boolean;
  isMobileViewport?: boolean;
  onForecastToggle: (enabled: boolean) => void;
  onForecastYearsChange: (years: number) => void;
  onSeasonChange: (value: GraphSeason) => void;
  onSelectChange: (value: string) => void;
  onToggleMobileGraphLegend?: () => void;
  selectedGraphMeasure: string;
  selectedGraphSeason: GraphSeason;
  selectedLocation?: {
    city: string;
    location_id: number;
    state: string;
  };
  seasonOptions: Array<{ label: string; value: GraphSeason }>;
  selectOptions: Array<{ label: string; value: string }>;
  trendGraphSnapshot?: TrendGraphSnapshot;
  unit: TemperatureUnit;
}

interface GraphContentProperties {
  graphHasError?: boolean;
  graphLoading: boolean;
  isMobileViewport: boolean;
  showTrendLegend: boolean;
  trendGraphSnapshot?: TrendGraphSnapshot;
  unit: TemperatureUnit;
}

interface GraphControlsPanelProperties {
  forecastEnabled: boolean;
  forecastWetbulbLevel?: WetbulbDescription;
  forecastYearsAhead: number;
  wetbulbDescription?: WetbulbDescription;
  isMobileGraphLegendOpen: boolean;
  isMobileViewport: boolean;
  onForecastToggle: (enabled: boolean) => void;
  onForecastYearsChange: (years: number) => void;
  onSeasonChange: (value: GraphSeason) => void;
  onSelectChange: (value: string) => void;
  onToggleMobileGraphLegend?: () => void;
  selectedGraphMeasure: string;
  selectedGraphSeason: GraphSeason;
  seasonOptions: Array<{ label: string; value: GraphSeason }>;
  selectOptions: Array<{ label: string; value: string }>;
}

interface GraphWetbulbSummaryProperties {
  forecastEnabled: boolean;
  forecastWetbulbLevel?: WetbulbDescription;
  wetbulbDescription?: WetbulbDescription;
}

interface MobileLegendToggleProperties {
  isMobileGraphLegendOpen: boolean;
  onToggleMobileGraphLegend: () => void;
}

const GraphLoadingState = (): React.ReactElement => (
  <div className="flex size-full flex-col items-center justify-center rounded-2xl graph-surface-panel">
    <Loader2
      aria-label="Loading graph"
      className="size-6 animate-spin text-primary"
      data-testid="graph-loader"
    />
    <span className="mt-2 text-muted-foreground">Loading graph...</span>
  </div>
);

const GenerateTrendGraph = dynamic(
  async () => {
    const graphModule = await import("@/features/graph");
    return graphModule.GenerateTrendGraph;
  },
  {
    loading: () => <GraphLoadingState />,
    ssr: false,
  },
);

const GraphEmptyState = (): React.ReactElement => (
  <div className="flex size-full items-center justify-center rounded-2xl px-4 text-center text-sm text-muted-foreground graph-surface-panel">
    Select a city to view wetbulb trend data.
  </div>
);

const GraphContent = ({
  graphHasError = false,
  graphLoading,
  isMobileViewport,
  showTrendLegend,
  trendGraphSnapshot,
  unit,
}: GraphContentProperties): React.ReactElement => {
  if (graphLoading) {
    return <GraphLoadingState />;
  }

  if (graphHasError) {
    return <ErrorGraphDisplay />;
  }

  if (!trendGraphSnapshot) {
    return <GraphEmptyState />;
  }

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
};

const handleSeasonSelectChange = (
  value: string | undefined,
  onSeasonChange: (value: GraphSeason) => void,
): void => {
  if (!value) {
    return;
  }

  onSeasonChange(normalizeGraphSeason(value));
};

const handleMeasureSelectChange = (
  value: string | undefined,
  onSelectChange: (value: string) => void,
): void => {
  if (!value) {
    return;
  }

  onSelectChange(value);
};

const GraphWetbulbSummary = ({
  forecastEnabled,
  forecastWetbulbLevel,
  wetbulbDescription,
}: GraphWetbulbSummaryProperties): React.ReactElement | null => {
  if (!wetbulbDescription) {
    return null;
  }

  const visibleForecastWetbulbLevel = forecastEnabled
    ? forecastWetbulbLevel
    : undefined;

  return (
    <div className="rounded-2xl p-4 glass-panel-muted">
      <p className="text-sm font-medium text-foreground">
        {wetbulbDescription.prefix}{" "}
        <span className={`font-bold ${wetbulbDescription.colorClass}`}>
          {wetbulbDescription.value}
        </span>
      </p>
      {visibleForecastWetbulbLevel && (
        <p className="mt-2 text-sm font-medium text-foreground">
          {visibleForecastWetbulbLevel.prefix}{" "}
          <span
            className={`font-bold ${visibleForecastWetbulbLevel.colorClass}`}
          >
            {visibleForecastWetbulbLevel.value}
          </span>
          {visibleForecastWetbulbLevel.confidenceRange && (
            <span className="ml-2 text-xs text-muted-foreground">
              {visibleForecastWetbulbLevel.confidenceRange}
            </span>
          )}
        </p>
      )}
    </div>
  );
};

const MobileLegendToggle = ({
  isMobileGraphLegendOpen,
  onToggleMobileGraphLegend,
}: MobileLegendToggleProperties): React.ReactElement => (
  <div className="sm:hidden">
    <Button
      aria-controls="mobile-trend-graph"
      aria-expanded={isMobileGraphLegendOpen}
      onClick={onToggleMobileGraphLegend}
      type="button"
      variant="outline"
    >
      {isMobileGraphLegendOpen ? "Hide Graph Legend" : "Show Graph Legend"}
    </Button>
  </div>
);

const GraphControlsPanel = memo(
  ({
    forecastEnabled,
    forecastWetbulbLevel,
    forecastYearsAhead,
    wetbulbDescription,
    isMobileGraphLegendOpen,
    isMobileViewport,
    onForecastToggle,
    onForecastYearsChange,
    onSeasonChange,
    onSelectChange,
    onToggleMobileGraphLegend,
    selectedGraphMeasure,
    selectedGraphSeason,
    seasonOptions,
    selectOptions,
  }: GraphControlsPanelProperties) => {
    const handleMeasureChange = useCallback(
      (value: string | undefined) => {
        handleMeasureSelectChange(value, onSelectChange);
      },
      [onSelectChange],
    );

    const handleSeasonChange = useCallback(
      (value: string | undefined) => {
        handleSeasonSelectChange(value, onSeasonChange);
      },
      [onSeasonChange],
    );

    const showMobileLegendToggle =
      isMobileViewport && onToggleMobileGraphLegend !== undefined;

    return (
      <div className="w-full max-w-md space-y-3 sm:space-y-4">
        <div>
          <Select
            className="w-full"
            contentClassName="z-12000"
            data={seasonOptions}
            label="Season"
            onChange={handleSeasonChange}
            size="sm"
            value={selectedGraphSeason}
          />
          {!isCurrentYearTrendAvailable(selectedGraphSeason) && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {GRAPH_CONFIG.YEAR_RANGE.END} point unavailable — insufficient
              data for this season.
            </p>
          )}
        </div>
        <Select
          className="w-full"
          contentClassName="z-12000"
          data={selectOptions}
          label="Measure"
          onChange={handleMeasureChange}
          size="sm"
          value={selectedGraphMeasure}
        />
        <ForecastControls
          enabled={forecastEnabled}
          onToggle={onForecastToggle}
          onYearsChange={onForecastYearsChange}
          yearsAhead={forecastYearsAhead}
        />
        <GraphWetbulbSummary
          forecastEnabled={forecastEnabled}
          forecastWetbulbLevel={forecastWetbulbLevel}
          wetbulbDescription={wetbulbDescription}
        />
        {showMobileLegendToggle && (
          <MobileLegendToggle
            isMobileGraphLegendOpen={isMobileGraphLegendOpen}
            onToggleMobileGraphLegend={onToggleMobileGraphLegend}
          />
        )}
      </div>
    );
  },
);

GraphControlsPanel.displayName = "GraphControlsPanel";

export const GraphSection = memo<GraphSectionProperties>(
  ({
    forecastEnabled,
    forecastWetbulbLevel,
    forecastYearsAhead,
    graphHasError = false,
    graphLoading,
    wetbulbDescription,
    isMobileGraphLegendOpen = false,
    isMobileViewport = false,
    onForecastToggle,
    onForecastYearsChange,
    onSeasonChange,
    onSelectChange,
    onToggleMobileGraphLegend,
    selectedGraphMeasure,
    selectedGraphSeason,
    selectedLocation,
    seasonOptions,
    selectOptions,
    trendGraphSnapshot,
    unit,
  }) => {
    const router = useRouter();
    const showTrendLegend = !isMobileViewport || isMobileGraphLegendOpen;

    const handleViewDetails = useCallback(() => {
      if (selectedLocation) {
        router.push(`/${selectedLocation.location_id}`);
      }
    }, [router, selectedLocation]);

    return (
      <div className="flex size-full max-w-full min-w-0 flex-col items-center gap-4 sm:min-h-0 sm:max-w-[95vw] sm:min-w-[320px] sm:flex-1 sm:gap-5">
        <GraphControlsPanel
          forecastEnabled={forecastEnabled}
          forecastWetbulbLevel={forecastWetbulbLevel}
          forecastYearsAhead={forecastYearsAhead}
          wetbulbDescription={wetbulbDescription}
          isMobileGraphLegendOpen={isMobileGraphLegendOpen}
          isMobileViewport={isMobileViewport}
          onForecastToggle={onForecastToggle}
          onForecastYearsChange={onForecastYearsChange}
          onSeasonChange={onSeasonChange}
          onSelectChange={onSelectChange}
          onToggleMobileGraphLegend={onToggleMobileGraphLegend}
          selectedGraphMeasure={selectedGraphMeasure}
          selectedGraphSeason={selectedGraphSeason}
          seasonOptions={seasonOptions}
          selectOptions={selectOptions}
        />
        <div className="flex w-full flex-1" id="mobile-trend-graph">
          <div className="flex min-h-[clamp(260px,48vh,620px)] w-full max-w-full flex-1 items-center justify-center sm:min-h-140 sm:max-w-5xl">
            <GraphContent
              graphHasError={graphHasError}
              graphLoading={graphLoading}
              isMobileViewport={isMobileViewport}
              showTrendLegend={showTrendLegend}
              trendGraphSnapshot={trendGraphSnapshot}
              unit={unit}
            />
          </div>
        </div>
        <div className="flex justify-center">
          <Button disabled={!selectedLocation} onClick={handleViewDetails}>
            View Full Details
          </Button>
        </div>
      </div>
    );
  },
);

GraphSection.displayName = "GraphSection";
