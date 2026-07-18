"use client";

import { PageLoader } from "@/components/app/page-loader";
import { WetbulbIndexLegend } from "@/components/app/wetbulb-index-legend";
import * as Sentry from "@sentry/nextjs";
import { useTheme } from "next-themes";
import React, { memo, useEffect, useMemo, useState } from "react";
import Map from "react-map-gl/maplibre";

import { isWebglSupported } from "../lib/webgl-support";
import { OptimizedMarker } from "./optimized-marker";

import type * as MapLibreGL from "maplibre-gl";
import type { CSSProperties } from "react";

type MapLibreModule = typeof MapLibreGL;
type StyleSpecification = MapLibreGL.StyleSpecification;
const MAP_CENTER_LAT = 39.5;
const MAP_CENTER_LNG = -98.35;
const INITIAL_ZOOM = 5;
const LIGHT_TILE_URLS = [
  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
];
const LIGHT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DARK_TILE_URLS = [
  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
];
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const MAP_SOURCE_ID = "basemap";
const MAP_LAYER_ID = "basemap-raster";
const IS_E2E_TEST_ENVIRONMENT = process.env.NEXT_PUBLIC_E2E_TEST === "true";

interface Location {
  city: string;
  lat: number;
  lng: number;
  location_id: number;
  state: string;
}

interface MapComponentProperties {
  locations: Location[];
  onMarkerClick: (_locationId: number) => void;
  onMarkerPrefetch?: (_locationId: number) => Promise<void> | void;
}

interface E2EMarkerSurfaceProperties {
  isDarkTheme: boolean;
  locations: Location[];
  onMarkerClick: (_locationId: number) => void;
}

interface E2EMarkerPosition {
  left: string;
  top: string;
}

interface E2EMarkerButtonProperties {
  location: Location;
  onMarkerClick: (_locationId: number) => void;
  position: E2EMarkerPosition;
}

const INITIAL_VIEW_STATE = {
  latitude: MAP_CENTER_LAT,
  longitude: MAP_CENTER_LNG,
  zoom: INITIAL_ZOOM,
};
const MAP_STYLE: CSSProperties = { height: "100%", width: "100%" };
const MAP_CONTAINER_TEST_ID = "map-container";
const E2E_MARKER_WIDTH = 30;
const E2E_MARKER_HEIGHT = 42;
const E2E_MARKER_FILL = "#1D4ED8";
const E2E_MARKER_FILL_OPACITY = 0.9;
const E2E_MARKER_GLOW_CLASS = "drop-shadow-[0_4px_10px_rgba(29,78,216,0.18)]";
const E2E_LIGHT_BACKGROUND_CLASS_NAME =
  "absolute inset-0 bg-linear-to-b from-[#dbeafe] to-[#e2e8f0]";
const E2E_DARK_BACKGROUND_CLASS_NAME =
  "absolute inset-0 bg-linear-to-b from-[#0f172a] to-[#111827]";
const E2E_LIGHT_FRAME_CLASS_NAME =
  "absolute inset-[8%] rounded-[45%] border border-slate-400 opacity-35";
const E2E_DARK_FRAME_CLASS_NAME =
  "absolute inset-[8%] rounded-[45%] border border-slate-400/20 opacity-35";
const E2E_MARKER_BUTTON_CLASS_NAME =
  "focus-visible:ring-ring absolute -translate-1/2 rounded-full border-0 bg-transparent p-0 leading-none focus-visible:ring-2 focus-visible:ring-offset-2";
const E2E_MARKER_POSITIONS = [
  { left: "18%", top: "72%" },
  { left: "74%", top: "78%" },
  { left: "49%", top: "69%" },
  { left: "35%", top: "46%" },
  { left: "14%", top: "26%" },
  { left: "58%", top: "29%" },
] as const;

const LIGHT_MAP_STYLE = {
  layers: [
    {
      id: MAP_LAYER_ID,
      source: MAP_SOURCE_ID,
      type: "raster",
    },
  ],
  sources: {
    [MAP_SOURCE_ID]: {
      attribution: LIGHT_TILE_ATTRIBUTION,
      tileSize: 256,
      tiles: LIGHT_TILE_URLS,
      type: "raster",
    },
  },
  version: 8,
} satisfies StyleSpecification;

const DARK_MAP_STYLE = {
  layers: [
    {
      id: MAP_LAYER_ID,
      source: MAP_SOURCE_ID,
      type: "raster",
    },
  ],
  sources: {
    [MAP_SOURCE_ID]: {
      attribution: DARK_TILE_ATTRIBUTION,
      tileSize: 256,
      tiles: DARK_TILE_URLS,
      type: "raster",
    },
  },
  version: 8,
} satisfies StyleSpecification;

interface LegendToggleButtonProperties {
  ariaControls: string;
  className: string;
  closedLabel: string;
  isLegendOpen: boolean;
  openLabel: string;
  setIsLegendOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface WetbulbIndexLegendOverlayProperties {
  isLegendOpen: boolean;
  setIsLegendOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const LegendToggleButton = React.memo(
  ({
    ariaControls,
    className,
    closedLabel,
    isLegendOpen,
    openLabel,
    setIsLegendOpen,
  }: LegendToggleButtonProperties) => {
    const handleClick = React.useCallback(() => {
      setIsLegendOpen((previous) => !previous);
    }, [setIsLegendOpen]);

    return (
      <button
        aria-controls={ariaControls}
        aria-expanded={isLegendOpen}
        className={className}
        onClick={handleClick}
        type="button"
      >
        {isLegendOpen ? openLabel : closedLabel}
      </button>
    );
  },
);

LegendToggleButton.displayName = "LegendToggleButton";

const WetbulbIndexLegendOverlay = ({
  isLegendOpen,
  setIsLegendOpen,
}: WetbulbIndexLegendOverlayProperties): React.ReactElement => (
  <>
    <div className="pointer-events-none absolute bottom-6 left-6 z-40 hidden sm:block">
      <div className="pointer-events-auto flex flex-col items-start gap-2">
        <LegendToggleButton
          ariaControls="desktop-wetbulb-index-legend"
          className="rounded-full px-4 py-2 text-sm font-semibold text-foreground glass-panel-muted transition hover:bg-accent"
          closedLabel="Show Wetbulb Index"
          isLegendOpen={isLegendOpen}
          openLabel="Hide Wetbulb Index"
          setIsLegendOpen={setIsLegendOpen}
        />
        {isLegendOpen && (
          <div id="desktop-wetbulb-index-legend">
            <WetbulbIndexLegend />
          </div>
        )}
      </div>
    </div>
    <div className="pointer-events-none absolute top-1/2 right-0 z-40 -translate-y-1/2 sm:hidden">
      <div className="pointer-events-auto flex items-center">
        {isLegendOpen && (
          <div
            className="mr-2 max-w-[78vw] rounded-3xl p-2 shadow-md glass-panel"
            id="mobile-wetbulb-index-legend"
          >
            <WetbulbIndexLegend />
          </div>
        )}
        <LegendToggleButton
          ariaControls="mobile-wetbulb-index-legend"
          className="rounded-l-2xl border-r-0 p-3 text-xs font-semibold text-foreground glass-panel-muted transition hover:bg-accent"
          closedLabel="Wetbulb"
          isLegendOpen={isLegendOpen}
          openLabel="Close"
          setIsLegendOpen={setIsLegendOpen}
        />
      </div>
    </div>
  </>
);

const getE2EMarkerPosition = (index: number): E2EMarkerPosition => {
  const fallbackColumn = index % 3;
  const fallbackRow = Math.floor(index / 3);
  const predefinedPosition = E2E_MARKER_POSITIONS[index];

  return (
    predefinedPosition ?? {
      left: `${18 + fallbackColumn * 28}%`,
      top: `${28 + fallbackRow * 18}%`,
    }
  );
};

const E2EMarkerButton = memo<E2EMarkerButtonProperties>(
  ({ location, onMarkerClick, position }): React.ReactElement => {
    const handleClick = React.useCallback(() => {
      onMarkerClick(location.location_id);
    }, [location.location_id, onMarkerClick]);

    const markerPositionStyle = React.useMemo<CSSProperties>(
      () => ({ left: position.left, top: position.top }),
      [position.left, position.top],
    );

    return (
      <button
        aria-label={`Open details for ${location.city}, ${location.state}`}
        className={E2E_MARKER_BUTTON_CLASS_NAME}
        data-map-marker="true"
        onClick={handleClick}
        style={markerPositionStyle}
        title={`${location.city}, ${location.state}`}
        type="button"
      >
        <svg
          aria-hidden="true"
          className={E2E_MARKER_GLOW_CLASS}
          fill="none"
          height={E2E_MARKER_HEIGHT}
          viewBox="0 0 28 40"
          width={E2E_MARKER_WIDTH}
        >
          <path
            d="M14 0C6.268 0 0 6.268 0 14c0 11.2 14 26 14 26s14-14.8 14-26C28 6.268 21.732 0 14 0z"
            fill={E2E_MARKER_FILL}
            fillOpacity={E2E_MARKER_FILL_OPACITY}
          />
          <circle cx="14" cy="14" fill="white" r="5" />
        </svg>
      </button>
    );
  },
);

E2EMarkerButton.displayName = "E2EMarkerButton";

const E2EMarkerSurface = ({
  isDarkTheme,
  locations,
  onMarkerClick,
}: E2EMarkerSurfaceProperties): React.ReactElement => {
  const backgroundClassName = isDarkTheme
    ? E2E_DARK_BACKGROUND_CLASS_NAME
    : E2E_LIGHT_BACKGROUND_CLASS_NAME;
  const frameClassName = isDarkTheme
    ? E2E_DARK_FRAME_CLASS_NAME
    : E2E_LIGHT_FRAME_CLASS_NAME;
  const markerLocations = React.useMemo(
    () =>
      locations.map((location, index) => ({
        location,
        position: getE2EMarkerPosition(index),
      })),
    [locations],
  );

  return (
    <section
      aria-label="Map"
      className="relative size-full overflow-hidden rounded-none"
      data-map-provider="maplibre"
      data-map-theme={isDarkTheme ? "dark" : "light"}
      data-testid={MAP_CONTAINER_TEST_ID}
    >
      <div className={backgroundClassName} />
      <div aria-hidden="true" className={frameClassName} />
      {markerLocations.map(({ location, position }) => (
        <E2EMarkerButton
          key={location.location_id}
          location={location}
          onMarkerClick={onMarkerClick}
          position={position}
        />
      ))}
    </section>
  );
};

interface FallbackCityButtonProperties {
  location: Location;
  onMarkerClick: (_locationId: number) => void;
}

const FallbackCityButton = memo<FallbackCityButtonProperties>(
  ({ location, onMarkerClick }): React.ReactElement => {
    const handleClick = React.useCallback(() => {
      onMarkerClick(location.location_id);
    }, [location.location_id, onMarkerClick]);

    return (
      <button
        className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground glass-panel-muted transition hover:bg-accent"
        onClick={handleClick}
        type="button"
      >
        {location.city}, {location.state}
      </button>
    );
  },
);

FallbackCityButton.displayName = "FallbackCityButton";

interface MapUnavailableFallbackProperties {
  locations: Location[];
  onMarkerClick: (_locationId: number) => void;
}

const MapUnavailableFallback = ({
  locations,
  onMarkerClick,
}: MapUnavailableFallbackProperties): React.ReactElement => {
  const sortedLocations = React.useMemo(
    () =>
      locations.toSorted((a, b) =>
        `${a.state} ${a.city}`.localeCompare(`${b.state} ${b.city}`),
      ),
    [locations],
  );

  return (
    <div className="h-full overflow-y-auto bg-background/30 px-4 py-8">
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-center text-2xl font-bold text-foreground">
          Interactive Map Unavailable
        </h1>
        <p className="mb-6 text-center text-muted-foreground">
          This device or browser can&apos;t display the map because WebGL is
          unavailable. You can still pick a city below to view its wetbulb
          details.
        </p>
        <ul className="space-y-2">
          {sortedLocations.map((location) => (
            <li key={location.location_id}>
              <FallbackCityButton
                location={location}
                onMarkerClick={onMarkerClick}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface MapErrorBoundaryProperties {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends React.Component<
  MapErrorBoundaryProperties,
  MapErrorBoundaryState
> {
  constructor(properties: MapErrorBoundaryProperties) {
    super(properties);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    Sentry.captureException(error, {
      tags: { component: "map-component" },
    });
  }

  render(): React.ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export const MapComponent = memo<MapComponentProperties>(
  ({ locations, onMarkerClick, onMarkerPrefetch }) => {
    const { resolvedTheme } = useTheme();
    const [mapLib, setMapLib] = useState<MapLibreModule | null>(null);
    const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
    const [isLegendOpen, setIsLegendOpen] = useState(false);

    useEffect(() => {
      let isCancelled = false;

      const loadMapLibrary = async () => {
        if (!isWebglSupported()) {
          if (!isCancelled) {
            setWebglSupported(false);
          }
          return;
        }

        if (!isCancelled) {
          setWebglSupported(true);
        }

        try {
          const loadedMapLib = await import("maplibre-gl");
          if (!isCancelled) {
            setMapLib(loadedMapLib);
          }
        } catch {
          // Ignore map library load failures and keep fallback UI.
        }
      };

      void loadMapLibrary();

      return () => {
        isCancelled = true;
      };
    }, []);

    const markers = useMemo(() => {
      if (locations.length === 0) {
        return null;
      }

      return locations.map((loc) => (
        <OptimizedMarker
          city={loc.city}
          latitude={loc.lat}
          longitude={loc.lng}
          key={loc.location_id}
          locationId={loc.location_id}
          onClick={onMarkerClick}
          onPrefetch={onMarkerPrefetch}
          state={loc.state}
        />
      ));
    }, [locations, onMarkerClick, onMarkerPrefetch]);

    const mapUnavailableFallback = useMemo(
      () => (
        <MapUnavailableFallback
          locations={locations}
          onMarkerClick={onMarkerClick}
        />
      ),
      [locations, onMarkerClick],
    );

    if (webglSupported === null || (webglSupported && !mapLib)) {
      return <PageLoader />;
    }

    if (locations.length === 0) {
      return (
        <div className="flex h-full items-center justify-center bg-background/30 px-4">
          <div className="mx-auto max-w-md p-6 text-center">
            <div className="mb-6">
              <svg
                className="mx-auto size-12 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-foreground">
              No Map Data Available
            </h1>
            <p className="mb-6 text-muted-foreground">
              Unable to load location data for the map. The database may be
              temporarily unavailable.
            </p>
            <div className="rounded-2xl p-4 glass-panel-muted">
              <p className="text-sm text-foreground">
                <strong>Need help?</strong> Contact Kenneth Porter at{" "}
                <a
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                  href="mailto:porteken@gmail.com"
                >
                  porteken@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    const isDarkTheme = resolvedTheme === "dark";

    if (IS_E2E_TEST_ENVIRONMENT) {
      return (
        <div className="relative size-full">
          <E2EMarkerSurface
            isDarkTheme={isDarkTheme}
            locations={locations}
            onMarkerClick={onMarkerClick}
          />
          <WetbulbIndexLegendOverlay
            isLegendOpen={isLegendOpen}
            setIsLegendOpen={setIsLegendOpen}
          />
        </div>
      );
    }

    if (!webglSupported || !mapLib) {
      return mapUnavailableFallback;
    }

    const mapStyleDefinition = isDarkTheme ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

    return (
      <MapErrorBoundary fallback={mapUnavailableFallback}>
        <div className="relative size-full">
          <div
            className="size-full"
            data-map-provider="maplibre"
            data-map-theme={isDarkTheme ? "dark" : "light"}
            data-testid={MAP_CONTAINER_TEST_ID}
          >
            <Map
              dragRotate={false}
              initialViewState={INITIAL_VIEW_STATE}
              mapLib={mapLib}
              mapStyle={mapStyleDefinition}
              scrollZoom
              style={MAP_STYLE}
            >
              {markers}
            </Map>
          </div>
          <WetbulbIndexLegendOverlay
            isLegendOpen={isLegendOpen}
            setIsLegendOpen={setIsLegendOpen}
          />
        </div>
      </MapErrorBoundary>
    );
  },
);

MapComponent.displayName = "MapComponent";
