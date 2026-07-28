"use client";

import { BasisProvider } from "@/components/app/basis-provider";
import { RegionProvider } from "@/components/app/region-provider";
import { ThemeProvider } from "@/components/app/theme-provider";
import { UnitProvider } from "@/components/app/unit-provider";
import { ToastProvider } from "@/components/ui/toast";
import * as React from "react";

import type { DataRegion } from "@/lib/constants";

export const AppProviders = ({
  children,
  initialRegion,
}: Readonly<{ children: React.ReactNode; initialRegion?: DataRegion }>) => (
  <ThemeProvider>
    <UnitProvider>
      <BasisProvider>
        <RegionProvider initialRegion={initialRegion}>
          <ToastProvider>{children}</ToastProvider>
        </RegionProvider>
      </BasisProvider>
    </UnitProvider>
  </ThemeProvider>
);
