"use client";

import { ThemeProvider } from "@/components/app/theme-provider";
import { UnitProvider } from "@/components/app/unit-provider";
import { ToastProvider } from "@/components/ui/toast";
import * as React from "react";

export const AppProviders = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => (
  <ThemeProvider>
    <UnitProvider>
      <ToastProvider>{children}</ToastProvider>
    </UnitProvider>
  </ThemeProvider>
);
