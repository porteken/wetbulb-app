import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { areaMock, lineMock, yAxisMock } = vi.hoisted(() => ({
  areaMock: vi.fn<(props: Record<string, any>) => React.ReactNode>(
    ({ children }) => <div data-testid="recharts-area">{children}</div>,
  ),
  lineMock: vi.fn<(props: Record<string, any>) => React.ReactNode>(
    ({ children }) => <div data-testid="recharts-line">{children}</div>,
  ),
  yAxisMock: vi.fn<(props: Record<string, any>) => React.ReactNode>(
    ({ children }) => <div data-testid="recharts-y-axis">{children}</div>,
  ),
}));

function createRechartsStub(testId: string) {
  return ({ children }: { children?: React.ReactNode }) => (
    <div data-testid={testId}>{children}</div>
  );
}

vi.mock("recharts", async () => ({
  Area: areaMock,
  CartesianGrid: createRechartsStub("recharts-grid"),
  ComposedChart: createRechartsStub("recharts-chart"),
  Legend: createRechartsStub("recharts-legend"),
  Line: lineMock,
  ResponsiveContainer: createRechartsStub("recharts-responsive-container"),
  Tooltip: createRechartsStub("recharts-tooltip"),
  XAxis: createRechartsStub("recharts-x-axis"),
  YAxis: yAxisMock,
}));

import { GenerateReferenceGraph, GenerateTrendGraph } from "@/features/graph";

const mockTrendlineWetbulbs1 = [25, 26, 27];
const mockYearWetbulbs1 = [25.2, 26.1, 27.4];
const mockYears1 = [2020, 2021, 2022];

const emptyWetbulbs: number[] = [];
const emptyYears: number[] = [];
const emptyDates: Date[] = [];

const mockForecastData = {
  forecastValues: [28.6, 29.1],
  forecastYears: [2023, 2024],
  lowerBound10: [27.8, 28.1],
  upperBound90: [29.3, 30],
};
const mockTrendlineWetbulbs2 = [24.5, 25.5, 26.5];
const mockYearWetbulbs2 = [24.8, 25.9, 26.7];

const mockCurrentWetbulbs = [24, 26];
const mockDates = [new Date("2025-01-01"), new Date("2025-02-01")];
const mockReferenceWetbulbs = [18, 20];

const mockTrendlineWetbulbs3 = [22, 27, 31];
const mockYearWetbulbs3 = [18, 24, 29];

const mockForecastData2 = {
  forecastValues: [29, 31],
  forecastYears: [2023, 2024],
  lowerBound10: [20, 19],
  upperBound90: [38, 39],
};

const mockTrendlineWetbulbs4 = [22, 27, 30];
const mockYearWetbulbs4 = [18, 24, 28];

const mockCurrentWetbulbs2 = [19, 31];
const mockReferenceWetbulbs2 = [18, 28];

describe("graph Components", () => {
  beforeEach(() => {
    areaMock.mockClear();
    lineMock.mockClear();
    yAxisMock.mockClear();
  });

  it("sets a tighter y-axis domain around trend data", () => {
    render(
      <GenerateTrendGraph
        increasePerYear={0.5}
        option="avg"
        season="Annual"
        trendlineWetbulbs={mockTrendlineWetbulbs3}
        yearWetbulbs={mockYearWetbulbs3}
        years={mockYears1}
      />,
    );

    expect(yAxisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        allowDataOverflow: true,
        domain: [16, 32],
      }),
      undefined,
    );
  });

  it("keeps the forecast y-axis tight to historical and forecast lines", () => {
    render(
      <GenerateTrendGraph
        forecastData={mockForecastData2}
        increasePerYear={0.5}
        option="avg"
        season="Annual"
        trendlineWetbulbs={mockTrendlineWetbulbs4}
        yearWetbulbs={mockYearWetbulbs4}
        years={mockYears1}
      />,
    );

    expect(yAxisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        allowDataOverflow: true,
        domain: [16, 32],
      }),
      undefined,
    );
  });

  describe("generateTrendGraph", () => {
    it("renders the chart shell and descriptive title", () => {
      render(
        <GenerateTrendGraph
          increasePerYear={0.5}
          option="avg"
          season="Annual"
          trendlineWetbulbs={mockTrendlineWetbulbs1}
          yearWetbulbs={mockYearWetbulbs1}
          years={mockYears1}
        />,
      );

      expect(screen.getByText("Average Annual Wetbulb")).toBeInTheDocument();
      expect(
        screen.getByText("2020–2022 · Increase per year: +0.50°F"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("trend-chart")).toBeInTheDocument();
      expect(
        screen.getByTestId("recharts-responsive-container"),
      ).toBeInTheDocument();
    });

    it("renders the empty state when there is no trend data", () => {
      render(
        <GenerateTrendGraph
          increasePerYear={0}
          option="avg"
          trendlineWetbulbs={emptyWetbulbs}
          yearWetbulbs={emptyWetbulbs}
          years={emptyYears}
        />,
      );

      expect(
        screen.getByText("No data available for the selected parameters."),
      ).toBeInTheDocument();
    });

    it("renders forecast-aware titles for maximum measure graphs", () => {
      render(
        <GenerateTrendGraph
          forecastData={mockForecastData}
          increasePerYear={0.42}
          option="max"
          season="Summer"
          trendlineWetbulbs={mockTrendlineWetbulbs2}
          yearWetbulbs={mockYearWetbulbs2}
          years={mockYears1}
        />,
      );

      expect(screen.getByText("Maximum Summer Wetbulb")).toBeInTheDocument();
      expect(screen.getAllByTestId("recharts-area")).toHaveLength(2);
    });

    it("only animates the trend series on the initial mount", () => {
      const { rerender } = render(
        <GenerateTrendGraph
          increasePerYear={0.5}
          option="avg"
          season="Annual"
          trendlineWetbulbs={mockTrendlineWetbulbs1}
          yearWetbulbs={mockYearWetbulbs1}
          years={mockYears1}
        />,
      );

      expect(
        lineMock.mock.calls
          .slice(-2)
          .every(([props]) => props.isAnimationActive),
      ).toBe(true);

      rerender(
        <GenerateTrendGraph
          increasePerYear={0.75}
          option="max"
          season="Summer"
          trendlineWetbulbs={mockTrendlineWetbulbs2}
          yearWetbulbs={mockYearWetbulbs2}
          years={mockYears1}
        />,
      );

      expect(
        lineMock.mock.calls
          .slice(-2)
          .every(([props]) => !props.isAnimationActive),
      ).toBe(true);
    });
  });

  describe("generateReferenceGraph", () => {
    it("sets a tighter y-axis domain around reference data", () => {
      render(
        <GenerateReferenceGraph
          currentWetbulbs={mockCurrentWetbulbs2}
          currentYear={2025}
          dates={mockDates}
          referenceWetbulbs={mockReferenceWetbulbs2}
          referenceYear="2000"
          season="Annual"
        />,
      );

      expect(yAxisMock).toHaveBeenCalledWith(
        expect.objectContaining({
          allowDataOverflow: true,
          domain: [16, 32],
        }),
        undefined,
      );
    });

    it("renders the comparison chart title and wrapper", () => {
      render(
        <GenerateReferenceGraph
          currentWetbulbs={mockCurrentWetbulbs}
          currentYear={2025}
          dates={mockDates}
          referenceWetbulbs={mockReferenceWetbulbs}
          referenceYear="2000"
          season="Annual"
        />,
      );

      expect(
        screen.getByText("Annual Wetbulb in 2025 vs 2000"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("reference-chart")).toBeInTheDocument();
    });

    it("uses clearer labels for the current and reference year series", () => {
      render(
        <GenerateReferenceGraph
          currentWetbulbs={mockCurrentWetbulbs}
          currentYear={2025}
          dates={mockDates}
          referenceWetbulbs={mockReferenceWetbulbs}
          referenceYear="2000"
          season="Annual"
        />,
      );

      expect(
        lineMock.mock.calls.some(
          ([props]) => props.name === "Current year (2025)",
        ),
      ).toBe(true);
      expect(
        lineMock.mock.calls.some(
          ([props]) => props.name === "Reference year (2000)",
        ),
      ).toBe(true);
    });

    it("renders the empty state when reference data is unavailable", () => {
      render(
        <GenerateReferenceGraph
          currentWetbulbs={emptyWetbulbs}
          dates={emptyDates}
          referenceWetbulbs={emptyWetbulbs}
          referenceYear="2000"
        />,
      );

      expect(
        screen.getByText("No data available for the selected parameters."),
      ).toBeInTheDocument();
    });
  });
});
