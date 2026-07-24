import React, { memo, useCallback, useMemo } from "react";
import { Marker } from "react-map-gl/maplibre";

const MARKER_WIDTH = 30;
const MARKER_HEIGHT = 42;
const MARKER_FILL = "#1D4ED8";
const MARKER_FILL_OPACITY = 0.9;
const MARKER_GLOW_CLASS = "drop-shadow-[0_4px_10px_rgba(29,78,216,0.18)]";

interface OptimizedMarkerProperties {
  city: string;
  latitude: number;
  longitude: number;
  locationId: number;
  onClick: (locationId: number) => void;
  onPrefetch?: (locationId: number) => Promise<void> | void;
  state: string;
}

export const OptimizedMarker = memo<OptimizedMarkerProperties>(
  ({ city, latitude, longitude, locationId, onClick, onPrefetch, state }) => {
    const markerLabel = useMemo(
      () => `Open details for ${city}, ${state}`,
      [city, state],
    );

    const handlePrefetch = useCallback(async () => {
      if (!onPrefetch) {
        return;
      }

      try {
        await onPrefetch(locationId);
      } catch {}
    }, [locationId, onPrefetch]);

    const handleMouseEnter = useCallback(() => {
      void (async () => {
        await handlePrefetch();
      })();
    }, [handlePrefetch]);

    const handleFocus = useCallback(() => {
      void (async () => {
        await handlePrefetch();
      })();
    }, [handlePrefetch]);

    const handleClick = useCallback(() => {
      onClick(locationId);
    }, [onClick, locationId]);

    return (
      <Marker anchor="bottom" latitude={latitude} longitude={longitude}>
        <button
          aria-label={markerLabel}
          className="origin-bottom rounded-full border-0 bg-transparent p-0 leading-none transition-transform hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-map-marker="true"
          onClick={handleClick}
          onFocus={handleFocus}
          onMouseEnter={handleMouseEnter}
          title={`${city}, ${state}`}
          type="button"
        >
          <svg
            aria-hidden="true"
            className={MARKER_GLOW_CLASS}
            fill="none"
            height={MARKER_HEIGHT}
            viewBox="0 0 28 40"
            width={MARKER_WIDTH}
          >
            <path
              d="M14 0C6.268 0 0 6.268 0 14c0 11.2 14 26 14 26s14-14.8 14-26C28 6.268 21.732 0 14 0z"
              fill={MARKER_FILL}
              fillOpacity={MARKER_FILL_OPACITY}
            />
            <circle cx="14" cy="14" fill="white" r="5" />
          </svg>
        </button>
      </Marker>
    );
  },
);

OptimizedMarker.displayName = "OptimizedMarker";
