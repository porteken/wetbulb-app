"use client";

import { useTemperatureUnit } from "@/components/app/unit-provider";
import { Button } from "@/components/ui/button";
import { useIgnorePersistenceError } from "@/hooks/use-ignore-persistence-error";
import { setTemperatureUnit } from "@/lib/actions/actions";
import * as React from "react";

export const UnitToggle = () => {
  const { setUnit, unit } = useTemperatureUnit();
  const ignorePersistenceError = useIgnorePersistenceError();

  const isCelsius = unit === "C";
  const nextUnit = isCelsius ? "F" : "C";
  const label = `Switch to °${nextUnit}`;

  const handleToggle = React.useCallback(() => {
    setUnit(nextUnit);
    void ignorePersistenceError(setTemperatureUnit(nextUnit));
  }, [setUnit, nextUnit, ignorePersistenceError]);

  return (
    <Button
      aria-label={label}
      className="justify-center sm:min-w-16"
      onClick={handleToggle}
      size="sm"
      type="button"
      variant="outline"
    >
      <span>°{unit}</span>
    </Button>
  );
};
