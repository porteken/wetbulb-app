"use client";

import {
  DATA_REGION_COOKIE_NAME,
  DEFAULT_DATA_REGION,
  normalizeDataRegion,
  type DataRegion,
} from "@/lib/constants";
import * as React from "react";

interface RegionContextValue {
  region: DataRegion;
  setRegion: (region: DataRegion) => void;
}

const RegionContext = React.createContext<RegionContextValue | undefined>(
  undefined,
);

export const readCookieRegion = (): DataRegion => {
  if (typeof document === "undefined") {
    return DEFAULT_DATA_REGION;
  }

  const match = new RegExp(
    String.raw`(?:^|;\s*)${DATA_REGION_COOKIE_NAME}=([^;]+)`,
    "u",
  ).exec(document.cookie);

  const rawValue = match?.[1];

  return normalizeDataRegion(
    rawValue ? decodeURIComponent(rawValue) : undefined,
  );
};

export function RegionProvider({
  children,
  initialRegion = DEFAULT_DATA_REGION,
}: Readonly<{
  children: React.ReactNode;
  initialRegion?: DataRegion;
}>): React.ReactElement {
  const [region, setRegion] = React.useState<DataRegion>(initialRegion);

  React.useEffect(() => {
    setRegion(readCookieRegion());
  }, []);

  const contextValue = React.useMemo(
    () => ({ region, setRegion }),
    [region, setRegion],
  );

  return (
    <RegionContext.Provider value={contextValue}>
      {children}
    </RegionContext.Provider>
  );
}

export function useDataRegion(): RegionContextValue {
  const context = React.useContext(RegionContext);

  if (!context) {
    throw new Error("useDataRegion must be used within a RegionProvider");
  }

  return context;
}
