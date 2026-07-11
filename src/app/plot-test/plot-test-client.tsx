"use client";

import { ChartResponsiveContainer } from "@/components/app/chart-responsive-container";
import {
  memo,
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const TEST_DATA = [
  { value: 18, year: "2000" },
  { value: 20, year: "2001" },
  { value: 22, year: "2002" },
  { value: 24, year: "2003" },
];

const CHART_DOT = { fill: "var(--graph-primary)", r: 4 };

const ChartToggleButton = memo(
  ({ setShow }: { setShow: Dispatch<SetStateAction<boolean>> }) => {
    const handleClick = useCallback(() => {
      setShow((previous) => !previous);
    }, [setShow]);

    return (
      <button
        className="w-fit rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-semibold text-foreground"
        id="toggle"
        onClick={handleClick}
        type="button"
      >
        Toggle
      </button>
    );
  },
);

ChartToggleButton.displayName = "ChartToggleButton";

export default function PlotTestClient() {
  const [show, setShow] = useState(true);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-10">
      <ChartToggleButton setShow={setShow} />
      {show && (
        <div
          className="h-96 rounded-3xl p-4 graph-surface-panel"
          data-testid="plot-test-chart"
        >
          <ChartResponsiveContainer minHeight={0} minWidth={0}>
            <LineChart data={TEST_DATA}>
              <CartesianGrid stroke="var(--graph-grid)" strokeDasharray="4 4" />
              <XAxis dataKey="year" stroke="var(--graph-text)" />
              <YAxis stroke="var(--graph-text)" />
              <Line
                dataKey="value"
                dot={CHART_DOT}
                stroke="var(--graph-primary)"
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          </ChartResponsiveContainer>
        </div>
      )}
    </div>
  );
}
