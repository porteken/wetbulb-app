"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import {
  DEFAULT_TEMPERATURE_UNIT,
  normalizeTemperatureUnit,
  TEMPERATURE_UNIT_COOKIE_NAME,
  type TemperatureUnit,
} from "@/lib/constants";
import * as React from "react";

interface UnitContextValue {
  setUnit: (unit: TemperatureUnit) => void;
  unit: TemperatureUnit;
}

const UnitContext = React.createContext<UnitContextValue | undefined>(
  undefined,
);

export const readCookieUnit = (): TemperatureUnit => {
  if (typeof document === "undefined") {
    return DEFAULT_TEMPERATURE_UNIT;
  }

  const match = new RegExp(
    String.raw`(?:^|;\s*)${TEMPERATURE_UNIT_COOKIE_NAME}=([^;]+)`,
    "u",
  ).exec(document.cookie);

  const rawValue = match?.[1];

  return normalizeTemperatureUnit(
    rawValue ? decodeURIComponent(rawValue) : undefined,
  );
};

export function UnitProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  const hydrated = useHydrated();
  const [selectedUnit, setUnit] =
    React.useState<TemperatureUnit>(readCookieUnit);
  const unit = hydrated ? selectedUnit : DEFAULT_TEMPERATURE_UNIT;

  const contextValue = React.useMemo(
    () => ({ setUnit, unit }),
    [setUnit, unit],
  );

  return (
    <UnitContext.Provider value={contextValue}>{children}</UnitContext.Provider>
  );
}

export function useTemperatureUnit(): UnitContextValue {
  const context = React.useContext(UnitContext);

  if (!context) {
    throw new Error("useTemperatureUnit must be used within a UnitProvider");
  }

  return context;
}
