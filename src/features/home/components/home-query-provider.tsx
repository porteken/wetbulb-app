"use client";

import { createQueryClient } from "@/lib/api/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

export const HomeQueryProvider = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const queryClient = React.useMemo(createQueryClient, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
