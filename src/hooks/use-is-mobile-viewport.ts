"use client";

import * as React from "react";

const MOBILE_VIEWPORT_QUERY = "(max-width: 639px)";

export const useIsMobileViewport = (query = MOBILE_VIEWPORT_QUERY): boolean => {
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);

  React.useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (typeof globalThis.matchMedia === "function") {
      const mediaQuery = globalThis.matchMedia(query);
      const updateViewportState = () => {
        setIsMobileViewport(mediaQuery.matches);
      };

      updateViewportState();
      mediaQuery.addEventListener("change", updateViewportState);

      cleanup = () => {
        mediaQuery.removeEventListener("change", updateViewportState);
      };
    }

    return cleanup;
  }, [query]);

  return isMobileViewport;
};
