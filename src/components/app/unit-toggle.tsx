"use client";

import { useTemperatureUnit } from "@/components/app/unit-provider";
import { Button } from "@/components/ui/button";
import * as React from "react";

export const UnitToggle = () => {
  const { setUnit, unit } = useTemperatureUnit();

  const isCelsius = unit === "C";
  const nextUnit = isCelsius ? "F" : "C";
  const label = `Switch to °${nextUnit}`;

  const handleToggle = React.useCallback(() => {
    setUnit(nextUnit);
  }, [setUnit, nextUnit]);

  return (
    <Button
      aria-label={label}
      className="min-w-16 justify-center"
      onClick={handleToggle}
      size="sm"
      type="button"
      variant="outline"
    >
      <span>°{unit}</span>
    </Button>
  );
};
