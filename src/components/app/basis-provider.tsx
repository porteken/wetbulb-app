"use client";

import {
  DEFAULT_WETBULB_BASIS,
  normalizeWetbulbBasis,
  WETBULB_BASIS_COOKIE_NAME,
  type WetbulbBasis,
} from "@/lib/constants";
import * as React from "react";

interface BasisContextValue {
  basis: WetbulbBasis;
  setBasis: (basis: WetbulbBasis) => void;
}

const BasisContext = React.createContext<BasisContextValue | undefined>(
  undefined,
);

const readCookieBasis = (): WetbulbBasis => {
  if (typeof document === "undefined") {
    return DEFAULT_WETBULB_BASIS;
  }

  const match = new RegExp(
    String.raw`(?:^|;\s*)${WETBULB_BASIS_COOKIE_NAME}=([^;]+)`,
    "u",
  ).exec(document.cookie);

  const rawValue = match?.[1];

  return normalizeWetbulbBasis(
    rawValue ? decodeURIComponent(rawValue) : undefined,
  );
};

export function BasisProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  const [basis, setBasis] = React.useState<WetbulbBasis>(DEFAULT_WETBULB_BASIS);

  React.useEffect(() => {
    setBasis(readCookieBasis());
  }, []);

  const contextValue = React.useMemo(
    () => ({ basis, setBasis }),
    [basis, setBasis],
  );

  return (
    <BasisContext.Provider value={contextValue}>
      {children}
    </BasisContext.Provider>
  );
}

export function useWetbulbBasis(): BasisContextValue {
  const context = React.useContext(BasisContext);

  if (!context) {
    throw new Error("useWetbulbBasis must be used within a BasisProvider");
  }

  return context;
}
