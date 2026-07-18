"use client";

import * as React from "react";

const MOBILE_VIEWPORT_QUERY = "(max-width: 639px)";

export const useIsMobileViewport = (query = MOBILE_VIEWPORT_QUERY): boolean => {
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
