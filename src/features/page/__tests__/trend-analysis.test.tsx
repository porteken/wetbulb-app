import "@testing-library/jest-dom";

import { MockForecastControls } from "@/testing/react-component-mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
};

vi.mock("@/features/graph", () => ({
  GenerateTrendGraph: mockFn().mockReturnValue(
    <div data-testid="mock-trend-graph">Trend Graph</div>,
  ),
}));

vi.mock("@/lib/api/fetch-client", () => ({
  FetchForecastData: mockFn().mockResolvedValue({
    forecastValues: [28, 30, 32],
    forecastYears: [2025, 2026, 2027],
    lowerBound10: [26, 28, 30],
    upperBound90: [30, 32, 34],
  }),
  FetchTrendGraphData: mockFn().mockResolvedValue({
    increase_per_year: 0.5,
    trendline_wetbulbs: [20, 22, 24, 26],
    year_wetbulbs: [20, 22, 24, 26],
    years: [2020, 2021, 2022, 2023],
  }),
}));

vi.mock("@/lib/utils/wetbulb-index", () => ({
  getForecastWetbulbDescription: mockFn(
    (value: number, year: number, lower: number, upper: number) => ({
      colorClass: "text-red-500",
      confidenceRange: `(range: ${lower}-${upper})`,
      prefix: "Forecast:",
      value: "High",
    }),
  ),
  getWetbulbDescription: mockFn(
    (value: number, option: string, year: number) => ({
      colorClass: "text-orange-500",
      prefix: `${year} Thermal Stress:`,
      value: "Moderate",
    }),
  ),
}));

vi.mock("@/components/app/forecast-controls", () => ({
  ForecastControls: mockFn(
    (props: React.ComponentProps<typeof MockForecastControls>) => (
      <MockForecastControls {...props} />
    ),
  ),
}));

vi.mock("@/lib/actions/actions", () => ({
  setForecastPreferences: mockFn().mockResolvedValue({}),
}));

const { mockToast } = vi.hoisted(() => ({ mockToast: mockFn() }));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { GenerateTrendGraph } from "@/features/graph";
import { setForecastPreferences } from "@/lib/actions/actions";
import { FetchForecastData, FetchTrendGraphData } from "@/lib/api/fetch-client";
import {
  getForecastWetbulbDescription,
  getWetbulbDescription,
} from "@/lib/utils/wetbulb-index";

import { TrendAnalysis } from "../components/trend-analysis";

const defaultProps: React.ComponentProps<typeof TrendAnalysis> = {
  graphSeason: "Annual",
  id: 1,
  initialForecastEnabled: false,
  initialForecastYearsAhead: 10,
  initialGraphMeasure: "avg",
  initialGraphSeason: "Annual",
  onMeasureChange: mockFn().mockResolvedValue(Promise.resolve()),
  onSeasonChange: mockFn().mockResolvedValue(Promise.resolve()),
};
const initialTrendlineWetbulbs = [20, 22, 24, 26];
const initialYearWetbulbs = [20, 22, 24, 26];
const initialYears = [2020, 2021, 2022, 2023];

const waitForInitialTrendAnalysisRender = async () => {
  await waitFor(() => {
    expect(GenerateTrendGraph).toHaveBeenCalled();
  });
};

describe("trendAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "matchMedia", {
      value: mockFn().mockReturnValue({
        addEventListener: mockFn(),
        addListener: mockFn(),
        dispatchEvent: mockFn(),
        matches: false,
        media: "(max-width: 639px)",
        onchange: undefined,
        removeEventListener: mockFn(),
        removeListener: mockFn(),
      }),
      writable: true,
    });
  });

  describe("basic Rendering", () => {
    it("should render trend analysis heading", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);
      await waitForInitialTrendAnalysisRender();

      expect(screen.getByText("Trend Analysis")).toBeInTheDocument();
    });

    it("should render graph measure select", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);
      await waitForInitialTrendAnalysisRender();

      expect(screen.getByLabelText("Graph Measure")).toBeInTheDocument();
    });

    it("should render forecast controls when measure is avg", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);
      await waitForInitialTrendAnalysisRender();

      expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
    });

    it("should render forecast controls for seasonal averages", async () => {
      renderWithQueryClient(
        <TrendAnalysis {...defaultProps} graphSeason="Winter" />,
      );
      await waitForInitialTrendAnalysisRender();

      expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
    });

    it("should render forecast controls when measure is max", async () => {
      renderWithQueryClient(
        <TrendAnalysis {...defaultProps} initialGraphMeasure="max" />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
      });
    });

    it("should render trend graph", async () => {
      const { container } = renderWithQueryClient(
        <TrendAnalysis {...defaultProps} />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("mock-trend-graph")).toBeInTheDocument();
      });

      expect(container.querySelector("#trend-analysis-graph")).toHaveClass(
        "flex-1",
      );
      expect(container.querySelector("#trend-analysis-graph")).not.toHaveClass(
        "mt-auto",
      );
    });

    it("should call FetchTrendGraphData on mount when no initial trend snapshot is provided", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(FetchTrendGraphData).toHaveBeenCalledWith("avg", 1, "Annual");
      });
    });

    it("should use the initial trend snapshot without refetching on mount", async () => {
      renderWithQueryClient(
        <TrendAnalysis
          {...defaultProps}
          initialIncreasePerYear={0.5}
          initialTrendlineWetbulbs={initialTrendlineWetbulbs}
          initialYearWetbulbs={initialYearWetbulbs}
          initialYears={initialYears}
        />,
      );

      await waitFor(() => {
        expect(GenerateTrendGraph).toHaveBeenCalledWith(
          expect.objectContaining({
            increasePerYear: 0.5,
            option: "avg",
            trendlineWetbulbs: [20, 22, 24, 26],
            yearWetbulbs: [20, 22, 24, 26],
            years: [2020, 2021, 2022, 2023],
          }),
          undefined,
        );
      });

      expect(FetchTrendGraphData).not.toHaveBeenCalled();
    });

    it("should call GenerateTrendGraph with fetched data", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(GenerateTrendGraph).toHaveBeenCalledWith(
          expect.objectContaining({
            forecastData: undefined,
            increasePerYear: 0.5,
            isMobileViewport: false,
            option: "avg",
            showLegend: true,
            trendlineWetbulbs: [20, 22, 24, 26],
            yearWetbulbs: [20, 22, 24, 26],
            years: [2020, 2021, 2022, 2023],
          }),
          undefined,
        );
      });
    });

    it("should keep mobile graph legend collapsed by default and toggle open", async () => {
      Object.defineProperty(globalThis, "matchMedia", {
        value: mockFn().mockReturnValue({
          addEventListener: mockFn(),
          addListener: mockFn(),
          dispatchEvent: mockFn(),
          matches: true,
          media: "(max-width: 639px)",
          onchange: undefined,
          removeEventListener: mockFn(),
          removeListener: mockFn(),
        }),
        writable: true,
      });

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("mock-trend-graph")).toBeInTheDocument();
      });

      const toggle = screen.getByRole("button", {
        name: "Show Graph Legend",
      });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      await waitFor(() => {
        const calls = vi.mocked(GenerateTrendGraph).mock.calls;
        expect(calls.at(-1)?.[0]).toStrictEqual(
          expect.objectContaining({
            isMobileViewport: true,
            showLegend: false,
          }),
        );
      });

      fireEvent.click(toggle);

      await waitFor(() => {
        const calls = vi.mocked(GenerateTrendGraph).mock.calls;
        expect(calls.at(-1)?.[0]).toStrictEqual(
          expect.objectContaining({
            isMobileViewport: true,
            showLegend: true,
          }),
        );
      });
    });
  });

  describe("thermal Stress Display", () => {
    it("should display current thermal stress description", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(getWetbulbDescription).toHaveBeenCalledWith(
          26,
          "avg",
          2023,
          "Annual",
        );
      });

      await waitFor(() => {
        expect(screen.getByText("2023 Thermal Stress:")).toBeInTheDocument();
        expect(screen.getByText("Moderate")).toBeInTheDocument();
      });
    });

    it("should not display thermal stress when years array is empty", async () => {
      vi.mocked(FetchTrendGraphData).mockResolvedValueOnce({
        increase_per_year: 0,
        trendline_wetbulbs: [],
        year_wetbulbs: [],
        years: [],
      });

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText("Thermal Stress:")).not.toBeInTheDocument();
      });
    });

    it("should display forecast thermal stress when forecast is enabled", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(FetchForecastData).toHaveBeenCalledWith(1, 10, "Annual", "avg");
      });

      await waitFor(() => {
        expect(getForecastWetbulbDescription).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText("Forecast:")).toBeInTheDocument();
      });
    });

    it("should display forecast confidence range when available", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(screen.getByText(/range:/u)).toBeInTheDocument();
      });
    });
  });

  describe("graph Measure Change", () => {
    it("should change measure when select value changes", async () => {
      const onMeasureChange = mockFn().mockResolvedValue(Promise.resolve());
      renderWithQueryClient(
        <TrendAnalysis {...defaultProps} onMeasureChange={onMeasureChange} />,
      );

      const select = screen.getByLabelText("Graph Measure");
      fireEvent.change(select, { target: { value: "max" } });

      await waitFor(() => {
        expect(onMeasureChange).toHaveBeenCalledWith("max");
      });
    });

    it("should refetch graph data with new measure", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(FetchTrendGraphData).toHaveBeenCalledWith("avg", 1, "Annual");
      });

      const select = screen.getByLabelText("Graph Measure");
      fireEvent.change(select, { target: { value: "max" } });

      await waitFor(() => {
        expect(FetchTrendGraphData).toHaveBeenCalledWith("max", 1, "Annual");
      });
    });

    it("should ignore onMeasureChange persistence errors", async () => {
      const onMeasureChange = mockFn().mockRejectedValue(
        new Error("Server error"),
      );

      renderWithQueryClient(
        <TrendAnalysis {...defaultProps} onMeasureChange={onMeasureChange} />,
      );

      const select = screen.getByLabelText("Graph Measure");
      fireEvent.change(select, { target: { value: "max" } });

      await waitFor(() => {
        expect(onMeasureChange).toHaveBeenCalledWith("max");
      });

      expect(select).toHaveValue("max");
    });

    it("should ignore stale graph responses when measure changes quickly", async () => {
      let resolveMaxRequest:
        | ((value: {
            increase_per_year: number;
            trendline_wetbulbs: number[];
            year_wetbulbs: number[];
            years: number[];
          }) => void)
        | undefined;

      vi.mocked(FetchTrendGraphData)
        .mockResolvedValueOnce({
          increase_per_year: 0.5,
          trendline_wetbulbs: [20, 22, 24, 26],
          year_wetbulbs: [20, 22, 24, 26],
          years: [2020, 2021, 2022, 2023],
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveMaxRequest = resolve;
            }),
        );

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitForInitialTrendAnalysisRender();

      const select = screen.getByLabelText("Graph Measure");
      fireEvent.change(select, { target: { value: "max" } });
      // Switch back to avg — React Query returns cached avg data immediately
      fireEvent.change(select, { target: { value: "avg" } });

      // Switching back to avg hits the query cache; graph shows original avg data
      await waitFor(() => {
        const calls = vi.mocked(GenerateTrendGraph).mock.calls;
        expect(calls.at(-1)?.[0]).toStrictEqual(
          expect.objectContaining({
            increasePerYear: 0.5,
            option: "avg",
            trendlineWetbulbs: [20, 22, 24, 26],
            yearWetbulbs: [20, 22, 24, 26],
          }),
        );
      });

      resolveMaxRequest?.({
        increase_per_year: 1.1,
        trendline_wetbulbs: [50, 51, 52, 53],
        year_wetbulbs: [49, 50, 51, 52],
        years: [2020, 2021, 2022, 2023],
      });

      // Stale max response resolves but the requestId guard discards it
      await waitFor(() => {
        const calls = vi.mocked(GenerateTrendGraph).mock.calls;
        expect(calls.at(-1)?.[0]).toStrictEqual(
          expect.objectContaining({
            increasePerYear: 0.5,
            option: "avg",
            trendlineWetbulbs: [20, 22, 24, 26],
            yearWetbulbs: [20, 22, 24, 26],
          }),
        );
      });
    });
  });

  describe("forecast Controls", () => {
    it("should enable forecast when toggle is clicked", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-toggle")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(FetchForecastData).toHaveBeenCalledWith(1, 10, "Annual", "avg");
      });

      expect(setForecastPreferences).toHaveBeenCalledWith(true, 10);
    });

    it("should update years ahead when input changes", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-years")).toBeInTheDocument();
      });

      const input = screen.getByTestId("forecast-years");
      fireEvent.change(input, { target: { value: "15" } });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(FetchForecastData).toHaveBeenCalledWith(1, 15, "Annual", "avg");
      });

      expect(setForecastPreferences).toHaveBeenCalledWith(false, 15);
    });

    it("should initialize forecast controls from cookie-backed props", async () => {
      renderWithQueryClient(
        <TrendAnalysis
          {...defaultProps}
          initialForecastEnabled={true}
          initialForecastYearsAhead={20}
        />,
      );

      await waitFor(() => {
        expect(FetchForecastData).toHaveBeenCalledWith(1, 20, "Annual", "avg");
      });
    });

    it("should fetch seasonal forecast data when enabled", async () => {
      renderWithQueryClient(
        <TrendAnalysis {...defaultProps} graphSeason="Winter" />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("forecast-toggle")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(FetchForecastData).toHaveBeenCalledWith(1, 10, "Winter", "avg");
      });
    });

    it("should ignore forecast preference persistence errors", async () => {
      vi.mocked(setForecastPreferences).mockRejectedValueOnce(
        new Error("Cookie write failed"),
      );

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-toggle")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(setForecastPreferences).toHaveBeenCalledWith(true, 10);
      });
    });

    it("should call GenerateTrendGraph with forecast data when enabled", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        const forecastData = expect.objectContaining({
          forecastValues: expect.any(Array),
        });
        const expectedTrendGraphProps = expect.objectContaining({
          forecastData,
          increasePerYear: expect.any(Number),
          isMobileViewport: false,
          option: "avg",
          showLegend: true,
          trendlineWetbulbs: expect.any(Array),
          yearWetbulbs: expect.any(Array),
          years: expect.any(Array),
        });

        expect(GenerateTrendGraph).toHaveBeenCalledWith(
          expectedTrendGraphProps,
          undefined,
        );
      });
    });

    it("should disable forecast when toggle is clicked again", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-toggle")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(FetchForecastData).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(FetchForecastData).not.toHaveBeenCalled();
      });
    });

    it("should not fetch forecast data when forecast is disabled", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(FetchTrendGraphData).toHaveBeenCalled();
      });

      expect(FetchForecastData).not.toHaveBeenCalled();
    });
  });

  describe("error Handling", () => {
    it("should handle API error gracefully", async () => {
      vi.mocked(FetchTrendGraphData).mockRejectedValueOnce(
        new Error("API Error"),
      );

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText("Unable to load trend data"),
        ).toBeInTheDocument();
      });
      expect(GenerateTrendGraph).not.toHaveBeenCalled();
    });

    it("should clear thermal stress on error", async () => {
      vi.mocked(FetchTrendGraphData).mockRejectedValueOnce(
        new Error("API Error"),
      );

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText("Unable to load trend data"),
        ).toBeInTheDocument();
      });

      expect(screen.queryByText("Thermal Stress:")).not.toBeInTheDocument();
    });

    it("should clear forecast thermal stress on error", async () => {
      vi.mocked(FetchTrendGraphData).mockRejectedValueOnce(
        new Error("API Error"),
      );

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText("Unable to load trend data"),
        ).toBeInTheDocument();
      });

      expect(screen.queryByText("Forecast:")).not.toBeInTheDocument();
    });
  });

  describe("edge Cases", () => {
    it("should handle empty forecast values", async () => {
      vi.mocked(FetchForecastData).mockResolvedValueOnce({
        forecastValues: [],
        forecastYears: [],
        lowerBound10: [],
        upperBound90: [],
      });

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      await waitFor(() => {
        expect(FetchForecastData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByText("Forecast:")).not.toBeInTheDocument();
      });
    });

    it("should handle single year of data", async () => {
      vi.mocked(FetchTrendGraphData).mockResolvedValueOnce({
        increase_per_year: 0,
        trendline_wetbulbs: [25],
        year_wetbulbs: [25],
        years: [2023],
      });

      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);

      await waitFor(() => {
        expect(getWetbulbDescription).toHaveBeenCalledWith(
          25,
          "avg",
          2023,
          "Annual",
        );
      });
    });

    it("should have correct select options", async () => {
      renderWithQueryClient(<TrendAnalysis {...defaultProps} />);
      await waitForInitialTrendAnalysisRender();

      const select = screen.getByLabelText("Graph Measure");
      const options = select.querySelectorAll("option");

      expect(options).toHaveLength(2);
      expect(options[0]).toHaveValue("avg");
      expect(options[1]).toHaveValue("max");
    });

    it("should have default measure selected", async () => {
      renderWithQueryClient(
        <TrendAnalysis {...defaultProps} initialGraphMeasure="avg" />,
      );
      await waitForInitialTrendAnalysisRender();

      const select = screen.getByLabelText("Graph Measure");
      expect(select).toHaveValue("avg");
    });
  });
});
