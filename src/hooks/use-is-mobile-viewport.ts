"use client";

import * as React from "react";

const MOBILE_VIEWPORT_QUERY = "(max-width: 639px)";

export const useIsMobileViewport = (query = MOBILE_VIEWPORT_QUERY): boolean => {
  // Initialize to `false` to match the server-rendered output. Reading
  // matchMedia here would diverge from SSR (where it is undefined) and cause a
  // hydration mismatch. The real value is synced in the effect below.
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);

  React.useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") {
      return () => {};
    }

    const mediaQuery = globalThis.matchMedia(query);
    const updateViewportState = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewportState();
    mediaQuery.addEventListener("change", updateViewportState);

    return () => {
      mediaQuery.removeEventListener("change", updateViewportState);
    };
  }, [query]);

  return isMobileViewport;
};
