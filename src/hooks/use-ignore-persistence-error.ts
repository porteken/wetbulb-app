"use client";

import { useToast } from "@/components/ui/toast";
import * as Sentry from "@sentry/nextjs";
import { useCallback } from "react";

export type IgnorePersistenceError = (promise: Promise<void>) => Promise<void>;

export const useIgnorePersistenceError = (): IgnorePersistenceError => {
  const { toast } = useToast();

  return useCallback(
    async (promise: Promise<void>) => {
      try {
        await promise;
      } catch (error) {
        console.error("Failed to persist preference", error);
        Sentry.captureException(error, {
          tags: { errorSource: "persistPreference" },
        });
        toast({
          description: "It will reset next visit.",
          title: "Couldn't save your preference",
          variant: "destructive",
        });
      }
    },
    [toast],
  );
};
