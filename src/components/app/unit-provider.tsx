"use client";

import {
  DEFAULT_TEMPERATURE_UNIT,
  normalizeTemperatureUnit,
  PREFERENCE_COOKIE_MAX_AGE_MS,
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

const readCookieUnit = (): TemperatureUnit => {
  if (typeof document === "undefined") {
    return DEFAULT_TEMPERATURE_UNIT;
  }

  const match = new RegExp(
    String.raw`(?:^|;\s*)${TEMPERATURE_UNIT_COOKIE_NAME}=([^;]+)`,
    "u",
  ).exec(document.cookie);

  return normalizeTemperatureUnit(
    match ? decodeURIComponent(match[1] ?? "") : undefined,
  );
};

// The CookieStore API isn't supported in every browser this app targets
// (notably Firefox and Safari), so this preference cookie is written
// directly; see the .oxlintrc.json override for this file.
const writeCookieUnit = (unit: TemperatureUnit): void => {
  const maxAgeSeconds = Math.floor(PREFERENCE_COOKIE_MAX_AGE_MS / 1000);
  document.cookie = `${TEMPERATURE_UNIT_COOKIE_NAME}=${unit}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
};

export function UnitProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  const [unit, setUnit] = React.useState<TemperatureUnit>(
    DEFAULT_TEMPERATURE_UNIT,
  );

  React.useEffect(() => {
    setUnit(readCookieUnit());
  }, []);

  const updateUnit = React.useCallback((nextUnit: TemperatureUnit) => {
    setUnit(nextUnit);
    writeCookieUnit(nextUnit);
  }, []);

  const contextValue = React.useMemo(
    () => ({ setUnit: updateUnit, unit }),
    [updateUnit, unit],
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
