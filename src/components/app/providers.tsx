"use client";

import { BasisProvider } from "@/components/app/basis-provider";
import { ThemeProvider } from "@/components/app/theme-provider";
import { UnitProvider } from "@/components/app/unit-provider";
import { ToastProvider } from "@/components/ui/toast";
import * as React from "react";

export const AppProviders = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => (
  <ThemeProvider>
    <UnitProvider>
      <BasisProvider>
        <ToastProvider>{children}</ToastProvider>
      </BasisProvider>
    </UnitProvider>
  </ThemeProvider>
);
