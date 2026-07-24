"use client";

import { useWetbulbBasis } from "@/components/app/basis-provider";
import { PageLoader } from "@/components/app/page-loader";
import { PageShell } from "@/components/app/page-shell";
import { useTemperatureUnit } from "@/components/app/unit-provider";
import { useIgnorePersistenceError } from "@/hooks/use-ignore-persistence-error";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import {
  setForecastPreferences,
  setGraphMeasure,
  setGraphSeason,
} from "@/lib/actions/actions";
import { prefetchTrendGraphData, queryKeys } from "@/lib/api/query-client";
import { normalizeGraphSeason, type GraphSeason } from "@/lib/constants";
import { GraphOptions, SeasonOptions } from "@/lib/utils/select-options";
import { deriveTrendAnalysis } from "@/lib/utils/trend-analysis";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import React, { useCallback, useMemo, useRef, useState } from "react";

import { useForecastData } from "../hooks/use-forecast-data";
import { useTrendGraphData } from "../hooks/use-trend-graph-data";
import { GraphSection } from "./graph-section";

import type { MapProperties } from "../model/types";
import type { LocationProperties } from "@/types/types";
import type { FC } from "react";

const Modal = dynamic(() => import("@/components/modal"), {
  ssr: false,
});
const MapComponent = dynamic(
  async () => {
    const mapComponentModule = await import("./map-component");
    return mapComponentModule.MapComponent;
  },
  {
    loading: () => <PageLoader />,
    ssr: false,
  },
);
const TREND_PREFETCH_STALE_TIME_MS = 1000 * 60 * 5;

const Home: FC<MapProperties> = ({
  initialForecastEnabled,
  initialForecastYearsAhead,
  initialGraphMeasure,
  initialGraphSeason,
  LocationOptions,
  locations,
}: MapProperties) => {
  const queryClient = useQueryClient();
  const ignorePersistenceError = useIgnorePersistenceError();
  const [selectedGraphMeasure, setSelectedGraphMeasure] = useState(
    () => initialGraphMeasure,
  );
  const [selectedGraphSeason, setSelectedGraphSeason] = useState<GraphSeason>(
    () => initialGraphSeason,
  );

  const [selectedLocationId, setSelectedLocationId] = useState<number>();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationProperties>();
  const [forecastEnabled, setForecastEnabled] = useState(
    () => initialForecastEnabled,
  );
  const [forecastYearsAhead, setForecastYearsAhead] = useState(
    () => initialForecastYearsAhead,
  );
  const isMobileViewport = useIsMobileViewport();
  const [isMobileGraphLegendOpen, setIsMobileGraphLegendOpen] = useState(false);
  const { unit } = useTemperatureUnit();
  const { basis } = useWetbulbBasis();
  const markerPrefetchOptionsRef = useRef({
    basis,
    graphMeasure: selectedGraphMeasure,
    graphSeason: selectedGraphSeason,
  });

  markerPrefetchOptionsRef.current = {
    basis,
    graphMeasure: selectedGraphMeasure,
    graphSeason: selectedGraphSeason,
  };

  const locationMap = useMemo(
    () => new Map(locations.map((loc) => [loc.location_id, loc])),
    [locations],
  );

  const selectOptions = useMemo(
    () =>
      GraphOptions.map((option) => ({
        label: option.label,
        value: option.key,
      })),
    [],
  );
  const seasonOptions = useMemo(
    () =>
      SeasonOptions.map((option) => ({
        label: option.label,
        value: normalizeGraphSeason(option.key),
      })),
    [],
  );

  const trendQuery = useTrendGraphData({
    basis,
    locationId: selectedLocationId,
    option: selectedGraphMeasure,
    season: selectedGraphSeason,
  });
  const forecastQuery = useForecastData({
    basis,
    enabled: forecastEnabled && selectedLocationId !== undefined,
    locationId: selectedLocationId,
    option: selectedGraphMeasure,
    season: selectedGraphSeason,
    yearsAhead: forecastYearsAhead,
  });

  const { forecastWetbulbLevel, wetbulbDescription, trendGraphSnapshot } =
    useMemo(() => {
      if (!trendQuery.data) {
        return {
          forecastWetbulbLevel: undefined,
          wetbulbDescription: undefined,
          trendGraphSnapshot: undefined,
        };
      }

      const result = deriveTrendAnalysis(
        trendQuery.data,
        forecastEnabled ? (forecastQuery.data ?? undefined) : undefined,
        selectedGraphMeasure,
        { season: selectedGraphSeason, unit },
      );

      return {
        forecastWetbulbLevel: result.forecastWetbulbLevel,
        wetbulbDescription: result.wetbulbDescription,
        trendGraphSnapshot: result.snapshot,
      };
    }, [
      trendQuery.data,
      forecastQuery.data,
      forecastEnabled,
      selectedGraphMeasure,
      selectedGraphSeason,
      unit,
    ]);
  const graphLoading = trendQuery.isLoading;
  const graphHasError = trendQuery.isError;

  const handleSelectChange = useCallback(
    (option: string) => {
      if (selectedLocationId !== undefined) {
        setIsMobileGraphLegendOpen(false);
        setSelectedGraphMeasure(option);
        void ignorePersistenceError(setGraphMeasure(option));
      }
    },
    [selectedLocationId, ignorePersistenceError],
  );

  const handleSeasonChange = useCallback(
    (season: GraphSeason) => {
      const nextSeason = normalizeGraphSeason(season);
      setIsMobileGraphLegendOpen(false);
      setSelectedGraphSeason(nextSeason);
      void ignorePersistenceError(setGraphSeason(nextSeason));
    },
    [ignorePersistenceError],
  );

  const handleMarkerClick = useCallback(
    (locationId: number) => {
      setIsMobileGraphLegendOpen(false);
      setSelectedLocationId(locationId);
      const location = locationMap.get(locationId);
      setSelectedLocation(location);
      setModalOpen(true);
    },
    [locationMap],
  );

  const handleMarkerPrefetch = useCallback(
    async (locationId: number) => {
      const {
        basis: prefetchBasis,
        graphMeasure,
        graphSeason,
      } = markerPrefetchOptionsRef.current;
      const queryKey = queryKeys.trendGraph(
        locationId,
        graphMeasure,
        graphSeason,
        prefetchBasis,
      );
      const queryState = queryClient.getQueryState(queryKey);
      const isFresh =
        queryState?.dataUpdatedAt !== undefined &&
        Date.now() - queryState.dataUpdatedAt < TREND_PREFETCH_STALE_TIME_MS;

      if (queryState?.fetchStatus === "fetching" || isFresh) {
        return;
      }

      try {
        await prefetchTrendGraphData(queryClient, locationId, graphMeasure, {
          basis: prefetchBasis,
          season: graphSeason,
        });
      } catch {
        // Ignore speculative prefetch failures.
      }
    },
    [queryClient],
  );

  const handleForecastToggle = useCallback(
    (enabled: boolean) => {
      setForecastEnabled(enabled);
      void setForecastPreferences(enabled, forecastYearsAhead);
    },
    [forecastYearsAhead],
  );

  const handleForecastYearsChange = useCallback(
    (yearsAhead: number) => {
      setForecastYearsAhead(yearsAhead);
      void setForecastPreferences(forecastEnabled, yearsAhead);
    },
    [forecastEnabled],
  );

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleToggleMobileGraphLegend = useCallback(() => {
    setIsMobileGraphLegendOpen((previous) => !previous);
  }, []);

  const desktopDialogHeightClass = useMemo(() => {
    if (graphLoading) {
      return "sm:!max-h-[94dvh] sm:!overflow-y-auto";
    }

    return "sm:!h-[96dvh] sm:!max-h-[99dvh] sm:!w-[95vw] sm:!max-w-5xl sm:!overflow-y-auto";
  }, [graphLoading]);

  return (
    <div className="flex h-dvh w-full flex-col">
      <PageShell
        headerWrapperClassName="z-10010 shrink-0"
        LocationOptions={LocationOptions}
        mainClassName="relative min-h-0 flex-1 overflow-hidden"
      >
        <MapComponent
          locations={locations}
          onMarkerClick={handleMarkerClick}
          onMarkerPrefetch={handleMarkerPrefetch}
        />
      </PageShell>
      <Modal
        dialogClassName={`${desktopDialogHeightClass} !bg-background !backdrop-blur-none`}
        mobileFullscreen
        onClose={handleModalClose}
        open={modalOpen}
        title={
          selectedLocation
            ? `${selectedLocation.city}, ${selectedLocation.state}`
            : undefined
        }
      >
        <GraphSection
          forecastEnabled={forecastEnabled}
          forecastWetbulbLevel={forecastWetbulbLevel}
          forecastYearsAhead={forecastYearsAhead}
          graphHasError={graphHasError}
          graphLoading={graphLoading}
          wetbulbDescription={wetbulbDescription}
          isMobileGraphLegendOpen={isMobileGraphLegendOpen}
          isMobileViewport={isMobileViewport}
          onForecastToggle={handleForecastToggle}
          onForecastYearsChange={handleForecastYearsChange}
          onSeasonChange={handleSeasonChange}
          onSelectChange={handleSelectChange}
          onToggleMobileGraphLegend={handleToggleMobileGraphLegend}
          selectedGraphMeasure={selectedGraphMeasure}
          selectedGraphSeason={selectedGraphSeason}
          selectedLocation={selectedLocation}
          seasonOptions={seasonOptions}
          selectOptions={selectOptions}
          trendGraphSnapshot={trendGraphSnapshot}
          unit={unit}
        />
      </Modal>
    </div>
  );
};

export default Home;
