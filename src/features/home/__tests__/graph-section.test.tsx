import "@testing-library/jest-dom";

import {
  MockForecastControls,
  MockSelectControl,
} from "@/testing/react-component-mocks";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = mockFn();

const getGraphSectionSelectTestId = (label?: string) =>
  label === "Season" ? "season-select" : "measure-select";

const highWetbulbDescription = {
  colorClass: "text-red-500",
  prefix: "Current thermal stress:",
  value: "High",
};

const moderateWetbulbDescription = {
  colorClass: "text-orange-500",
  prefix: "Current:",
  value: "Moderate",
};

const extremeForecastWetbulbLevel = {
  colorClass: "text-red-600",
  confidenceRange: "(range: 20-30)",
  prefix: "Forecast:",
  value: "Extreme",
};

const extremeForecastWetbulbLevelWithoutRange = {
  colorClass: "text-red-600",
  confidenceRange: undefined,
  prefix: "Forecast:",
  value: "Extreme",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: mockFn(
    ({
      children,
      disabled,
      onClick,
    }: {
      children: React.ReactNode;
      disabled?: boolean;
      onClick?: () => void;
    }) => (
      <button
        data-testid="view-details-button"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    ),
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: mockFn((props: React.ComponentProps<typeof MockSelectControl>) => (
    <MockSelectControl {...props} getTestId={getGraphSectionSelectTestId} />
  )),
}));

vi.mock("@/components/app/forecast-controls", () => ({
  ForecastControls: mockFn(
    (props: React.ComponentProps<typeof MockForecastControls>) => (
      <MockForecastControls {...props} />
    ),
  ),
}));

vi.mock("@/features/graph", () => ({
  GenerateTrendGraph: mockFn().mockReturnValue(
    <div data-testid="wetbulb-graph">Mock Graph</div>,
  ),
}));

import { GraphSection } from "../components/graph-section";

const defaultProps: React.ComponentProps<typeof GraphSection> = {
  forecastEnabled: false,
  forecastWetbulbLevel: undefined,
  forecastYearsAhead: 10,
  graphHasError: false,
  graphLoading: false,
  wetbulbDescription: undefined,
  onForecastToggle: mockFn(),
  onForecastYearsChange: mockFn(),
  onSeasonChange: mockFn(),
  onSelectChange: mockFn(),
  selectedGraphMeasure: "avg",
  selectedGraphSeason: "Annual",
  selectedLocation: { city: "New York", location_id: 1, state: "NY" },
  seasonOptions: [
    { label: "Annual", value: "Annual" },
    { label: "Winter", value: "Winter" },
  ],
  selectOptions: [
    { label: "Average", value: "avg" },
    { label: "Maximum", value: "max" },
  ],
  trendGraphSnapshot: {
    forecastData: undefined,
    increase_per_year: 0.5,
    option: "avg",
    season: "Annual",
    trendline_wetbulbs: [20, 22, 24],
    year_wetbulbs: [20, 22, 24],
    years: [2020, 2021, 2022],
  },
  unit: "F",
};

describe("graphSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
  });

  describe("basic Rendering", () => {
    it("should render measure select", () => {
      render(<GraphSection {...defaultProps} />);

      expect(screen.getByTestId("measure-select")).toBeInTheDocument();
      expect(screen.getByText("Measure")).toBeInTheDocument();
      expect(screen.getByText("Season")).toBeInTheDocument();
    });

    it("should render view details button", () => {
      render(<GraphSection {...defaultProps} />);

      expect(screen.getByTestId("view-details-button")).toBeInTheDocument();
      expect(screen.getByText("View Full Details")).toBeInTheDocument();
    });

    it("should render wetbulb graph when provided", () => {
      const { container } = render(<GraphSection {...defaultProps} />);

      expect(screen.getByTestId("wetbulb-graph")).toBeInTheDocument();
      expect(container.querySelector("#mobile-trend-graph")).toHaveClass(
        "flex-1",
      );
    });

    it("should render forecast controls when measure is avg", () => {
      render(<GraphSection {...defaultProps} selectedGraphMeasure="avg" />);

      expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
    });

    it("should render forecast controls for seasonal averages", () => {
      render(
        <GraphSection
          {...defaultProps}
          selectedGraphMeasure="avg"
          selectedGraphSeason="Winter"
        />,
      );

      expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
    });

    it("should render forecast controls when measure is max", () => {
      render(<GraphSection {...defaultProps} selectedGraphMeasure="max" />);

      expect(screen.getByTestId("forecast-controls")).toBeInTheDocument();
    });
  });

  describe("thermal Stress Display", () => {
    it("should display thermal stress description when provided", () => {
      render(
        <GraphSection
          {...defaultProps}
          wetbulbDescription={highWetbulbDescription}
        />,
      );

      expect(screen.getByText("Current thermal stress:")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("High")).toHaveClass("text-red-500");
    });

    it("should not display thermal stress section when not provided", () => {
      render(
        <GraphSection {...defaultProps} wetbulbDescription={undefined} />,
      );

      expect(
        screen.queryByText("Current thermal stress:"),
      ).not.toBeInTheDocument();
    });

    it("should display forecast thermal stress when enabled and provided", () => {
      render(
        <GraphSection
          {...defaultProps}
          forecastEnabled={true}
          forecastWetbulbLevel={extremeForecastWetbulbLevel}
          wetbulbDescription={moderateWetbulbDescription}
        />,
      );

      expect(screen.getByText("Forecast:")).toBeInTheDocument();
      expect(screen.getByText("Extreme")).toBeInTheDocument();
      expect(screen.getByText("(range: 20-30)")).toBeInTheDocument();
    });

    it("should not display forecast thermal stress when forecast is disabled", () => {
      render(
        <GraphSection
          {...defaultProps}
          forecastEnabled={false}
          forecastWetbulbLevel={extremeForecastWetbulbLevel}
          wetbulbDescription={moderateWetbulbDescription}
        />,
      );

      expect(screen.queryByText("Forecast:")).not.toBeInTheDocument();
    });
  });

  describe("loading State", () => {
    it("should display loader when graphLoading is true", () => {
      render(<GraphSection {...defaultProps} graphLoading={true} />);

      expect(screen.getByTestId("graph-loader")).toBeInTheDocument();
      expect(screen.getByText("Loading graph...")).toBeInTheDocument();
    });

    it("should not display loader when graphLoading is false", () => {
      render(<GraphSection {...defaultProps} graphLoading={false} />);

      expect(screen.queryByTestId("graph-loader")).not.toBeInTheDocument();
      expect(screen.getByTestId("wetbulb-graph")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onSelectChange when measure is changed", () => {
      const onSelectChange = mockFn();
      render(
        <GraphSection {...defaultProps} onSelectChange={onSelectChange} />,
      );

      const select = screen.getByTestId("measure-select");
      fireEvent.change(select, { target: { value: "max" } });

      expect(onSelectChange).toHaveBeenCalledWith("max");
    });

    it("should not call onSelectChange when value is empty", () => {
      const onSelectChange = mockFn();
      render(
        <GraphSection {...defaultProps} onSelectChange={onSelectChange} />,
      );

      const select = screen.getByTestId("measure-select");
      fireEvent.change(select, { target: { value: "" } });

      expect(onSelectChange).not.toHaveBeenCalled();
    });

    it("should call onForecastToggle when forecast toggle is clicked", () => {
      const onForecastToggle = mockFn();
      render(
        <GraphSection
          {...defaultProps}
          forecastEnabled={false}
          onForecastToggle={onForecastToggle}
          selectedGraphMeasure="avg"
        />,
      );

      fireEvent.click(screen.getByTestId("forecast-toggle"));

      expect(onForecastToggle).toHaveBeenCalledWith(true);
    });

    it("should call onForecastYearsChange when years input changes", () => {
      const onForecastYearsChange = mockFn();
      render(
        <GraphSection
          {...defaultProps}
          onForecastYearsChange={onForecastYearsChange}
          selectedGraphMeasure="avg"
        />,
      );

      const input = screen.getByTestId("forecast-years");
      fireEvent.change(input, { target: { value: "15" } });

      expect(onForecastYearsChange).toHaveBeenCalledWith(15);
    });

    it("should navigate to location page when view details is clicked", () => {
      render(<GraphSection {...defaultProps} />);

      fireEvent.click(screen.getByTestId("view-details-button"));

      expect(mockPush).toHaveBeenCalledWith("/1");
    });

    it("should disable view details button when no location selected", () => {
      render(<GraphSection {...defaultProps} selectedLocation={undefined} />);

      expect(screen.getByTestId("view-details-button")).toBeDisabled();
    });

    it("should not navigate when button is disabled", () => {
      render(<GraphSection {...defaultProps} selectedLocation={undefined} />);

      fireEvent.click(screen.getByTestId("view-details-button"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should show mobile legend toggle when in mobile viewport", () => {
      const onToggleMobileGraphLegend = mockFn();
      render(
        <GraphSection
          {...defaultProps}
          isMobileViewport={true}
          onToggleMobileGraphLegend={onToggleMobileGraphLegend}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Show Graph Legend" }),
      ).toBeInTheDocument();
    });

    it("should call onToggleMobileGraphLegend when mobile legend toggle is clicked", () => {
      const onToggleMobileGraphLegend = mockFn();
      render(
        <GraphSection
          {...defaultProps}
          isMobileViewport={true}
          onToggleMobileGraphLegend={onToggleMobileGraphLegend}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Show Graph Legend" }),
      );

      expect(onToggleMobileGraphLegend).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge Cases", () => {
    it("should render without wetbulb graph", () => {
      render(<GraphSection {...defaultProps} trendGraphSnapshot={undefined} />);

      expect(screen.getByTestId("view-details-button")).toBeInTheDocument();
      expect(
        screen.getByText("Select a city to view wetbulb trend data."),
      ).toBeInTheDocument();
    });

    it("should handle missing confidence range in forecast thermal stress", () => {
      render(
        <GraphSection
          {...defaultProps}
          forecastEnabled={true}
          forecastWetbulbLevel={extremeForecastWetbulbLevelWithoutRange}
          wetbulbDescription={moderateWetbulbDescription}
        />,
      );

      expect(screen.getByText("Forecast:")).toBeInTheDocument();
      expect(screen.queryByText("(range:")).not.toBeInTheDocument();
    });

    it("should display correct select options", () => {
      render(<GraphSection {...defaultProps} />);

      const select = screen.getByTestId("measure-select");
      const options = select.querySelectorAll("option");

      expect(options).toHaveLength(2);
      expect(options[0]).toHaveValue("avg");
      expect(options[1]).toHaveValue("max");
    });

    it("should have correct default measure selected", () => {
      render(<GraphSection {...defaultProps} selectedGraphMeasure="avg" />);

      const select = screen.getByTestId("measure-select");
      expect(select).toHaveValue("avg");
    });
  });
});
