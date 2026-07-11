"use client";

import {
  MAX_FORECAST_YEARS_AHEAD,
  MIN_FORECAST_YEARS_AHEAD,
} from "@/lib/constants";
import * as React from "react";

interface ForecastControlsProperties {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onYearsChange: (years: number) => void;
  yearsAhead: number;
}

const ForecastControlsComponent: React.FC<ForecastControlsProperties> = ({
  enabled,
  onToggle,
  onYearsChange,
  yearsAhead,
}) => {
  const handleEnabledChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onToggle(event.target.checked);
    },
    [onToggle],
  );

  const handleYearsInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onYearsChange(Number(event.target.value));
    },
    [onYearsChange],
  );

  return (
    <div className="space-y-3 rounded-2xl p-4 glass-panel-muted">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm font-medium text-foreground">
          <input
            aria-label="Show Forecast"
            checked={enabled}
            className="size-4 rounded-sm border border-border bg-background text-primary focus-visible:ring-2 focus-visible:ring-primary"
            onChange={handleEnabledChange}
            type="checkbox"
          />
          <span>Show Forecast</span>
        </label>
      </div>

      {enabled && (
        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-foreground"
            htmlFor="forecast-years"
          >
            Forecast {yearsAhead} year{yearsAhead === 1 ? "" : "s"} ahead
          </label>
          <input
            aria-label="Forecast years ahead"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-(--slider-track) accent-(--slider-thumb)"
            id="forecast-years"
            max={MAX_FORECAST_YEARS_AHEAD}
            min={MIN_FORECAST_YEARS_AHEAD}
            onChange={handleYearsInputChange}
            step={1}
            type="range"
            value={yearsAhead}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{MIN_FORECAST_YEARS_AHEAD} years</span>
            <span>{MAX_FORECAST_YEARS_AHEAD} years</span>
          </div>
        </div>
      )}
    </div>
  );
};

ForecastControlsComponent.displayName = "ForecastControls";

export const ForecastControls = React.memo(ForecastControlsComponent);
