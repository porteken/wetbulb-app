import React from "react";

export const PageLoader = () => (
  <div
    aria-live="polite"
    className="flex h-screen w-full items-center justify-center bg-background"
  >
    <div className="flex flex-col items-center space-y-4">
      <div
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
      />
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  </div>
);
