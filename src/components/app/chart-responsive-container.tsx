"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

interface ChartResponsiveContainerProperties {
  children: React.ReactElement;
  className?: string;
  minHeight?: number;
  minWidth?: number;
}

const MIN_INITIAL_CHART_DIMENSION = 1;

const hasPositiveSize = (width: number, height: number): boolean =>
  width > 0 && height > 0;

const toInitialChartDimension = (value: number): number =>
  Math.max(MIN_INITIAL_CHART_DIMENSION, Math.round(value));

export const ChartResponsiveContainer = ({
  children,
  className,
  minHeight = 0,
  minWidth = 0,
}: ChartResponsiveContainerProperties): React.ReactElement => {
  const containerReference = React.useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [initialDimension, setInitialDimension] = React.useState(() => ({
    height: MIN_INITIAL_CHART_DIMENSION,
    width: MIN_INITIAL_CHART_DIMENSION,
  }));
  const containerClassName = ["size-full", "min-h-0", "min-w-0", className]
    .filter(Boolean)
    .join(" ");

  React.useEffect(() => {
    const container = containerReference.current;
    if (!container) {
      return () => {};
    }

    if (
      process.env.NODE_ENV === "test" ||
      typeof globalThis.ResizeObserver !== "function"
    ) {
      const { height, width } = container.getBoundingClientRect();
      if (hasPositiveSize(width, height)) {
        setInitialDimension((previous) => {
          const nextWidth = toInitialChartDimension(width);
          const nextHeight = toInitialChartDimension(height);

          if (previous.width === nextWidth && previous.height === nextHeight) {
            return previous;
          }

          return { height: nextHeight, width: nextWidth };
        });
      }

      setIsReady(true);
      return () => {};
    }

    const updateReadiness = (width: number, height: number) => {
      if (!hasPositiveSize(width, height)) {
        setIsReady(false);
        return;
      }

      setInitialDimension((previous) => {
        const nextWidth = toInitialChartDimension(width);
        const nextHeight = toInitialChartDimension(height);

        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }

        return { height: nextHeight, width: nextWidth };
      });
      setIsReady(true);
    };

    const measureContainer = () => {
      const { height, width } = container.getBoundingClientRect();
      updateReadiness(width, height);
    };

    measureContainer();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        measureContainer();
        return;
      }

      updateReadiness(entry.contentRect.width, entry.contentRect.height);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={containerClassName} ref={containerReference}>
      {isReady ? (
        <ResponsiveContainer
          height="100%"
          initialDimension={initialDimension}
          minHeight={minHeight}
          minWidth={minWidth}
          width="100%"
        >
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
};
