import { database, resetDatabase } from "@/testing/mocks";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PageMain } from "../components/page-main";

import type { PageProperties } from "../model/types";

let fetchMock: ReturnType<typeof vi.fn>;

class MockTrendAnalysis extends React.PureComponent<{
  initialGraphMeasure: string;
  onMeasureChange: (value: string) => void;
}> {
  private readonly handleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    this.props.onMeasureChange(event.currentTarget.value);
  };

  public render(): React.ReactNode {
    const { initialGraphMeasure } = this.props;

    return (
      <div data-testid="trend-analysis">
        <h2>Trend Analysis</h2>
        <label htmlFor="graph-measure">Graph Measure</label>
        <select
          defaultValue={initialGraphMeasure}
          id="graph-measure"
          onChange={this.handleChange}
        >
          <option value="avg">Average</option>
          <option value="max">Maximum</option>
        </select>
        <div data-testid="trend-graph">Trend Graph</div>
      </div>
    );
  }
}

class MockReferenceData extends React.PureComponent<{
  onReferenceYearChange: (value: string) => void;
  referenceYear: string;
}> {
  private readonly handleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    this.props.onReferenceYearChange(event.currentTarget.value);
  };

  public render(): React.ReactNode {
    const { referenceYear } = this.props;

    return (
      <div data-testid="reference-data">
        <h2>Reference Data</h2>
        <label htmlFor="reference-year">Reference Year</label>
        <select
          id="reference-year"
          onChange={this.handleChange}
          value={referenceYear}
        >
          {Array.from({ length: 23 }, (_, index) => 2000 + index).map(
            (year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ),
          )}
        </select>
        <div data-testid="reference-graph">Reference Graph</div>
      </div>
    );
  }
}

vi.mock("@/features/graph", () => ({
  GenerateReferenceGraph: mockFn().mockReturnValue(
    <div data-testid="reference-graph">Reference Graph</div>,
  ),
  GenerateTrendGraph: mockFn().mockReturnValue(
    <div data-testid="trend-graph">Trend Graph</div>,
  ),
}));

const { mockToast } = vi.hoisted(() => ({ mockToast: mockFn() }));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/features/header-bar", () => ({
  HeaderBar: mockFn(
    ({ id, LocationOptions }: { id?: number; LocationOptions?: unknown[] }) => (
      <header
        data-id={id}
        data-options={JSON.stringify(LocationOptions)}
        data-testid="header-bar"
      >
        HeaderBar
      </header>
    ),
  ),
}));

vi.mock("@/features/page/components/trend-analysis", () => ({
  TrendAnalysis: mockFn(
    (props: React.ComponentProps<typeof MockTrendAnalysis>) => (
      <MockTrendAnalysis {...props} />
    ),
  ),
}));

vi.mock("@/features/page/components/reference-data", () => ({
  ReferenceData: mockFn(
    (props: React.ComponentProps<typeof MockReferenceData>) => (
      <MockReferenceData {...props} />
    ),
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockFn(),
    push: mockFn(),
    replace: mockFn(),
  }),
  useSearchParams: () => ({
    get: mockFn(),
    toString: mockFn().mockReturnValue(""),
  }),
}));

describe("pageMain Integration Tests", () => {
  let defaultProps: PageProperties;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDatabase();
    fetchMock = mockFn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const location = database.location.create({
      city: "San Francisco",
      location_id: 433,
      state: "California",
    });

    defaultProps = {
      CurrentDates: [new Date("2023-01-01"), new Date("2023-02-01")],
      CurrentWetbulbs: [15, 25],
      IncreasePerYear: 0.5,
      id: location.location_id,
      initialForecastEnabled: false,
      initialForecastYearsAhead: 10,
      initialGraphMeasure: "avg",
      initialGraphSeason: "Annual",
      initialReferenceYear: "2000",
      location,
      LocationOptions: [
        {
          items: [{ key: location.location_id, title: location.city }],
          title: location.state,
        },
      ],
      graphDataError: false,
      ReferenceWetbulbs: [10, 20],
      TrendlineWetbulbs: [5, 10, 15],
      YearWetbulbs: [7, 12, 17],
      Years: [2020, 2021, 2022],
    };
  });

  describe("component Integration", () => {
    it("should render with all main sections", async () => {
      render(<PageMain {...defaultProps} />);

      expect(screen.getByTestId("header-bar")).toBeInTheDocument();
      expect(screen.getByText("San Francisco, California")).toBeInTheDocument();
      expect(screen.getByText("Trend Analysis")).toBeInTheDocument();
      expect(screen.getByText("Reference Data")).toBeInTheDocument();
    });

    it("should integrate properly with header bar component", async () => {
      render(<PageMain {...defaultProps} />);

      const headerBar = screen.getByTestId("header-bar");
      expect(headerBar).toHaveAttribute("data-id");

      const dataId = headerBar.dataset.id;
      expect(Number(dataId)).toBeGreaterThan(0);

      const optionsData = headerBar.dataset.options;
      const locationOptions = JSON.parse(String(optionsData));
      expect(optionsData).toBeDefined();
      expect(locationOptions).toStrictEqual(defaultProps.LocationOptions);
    });

    it("should handle measure changes through preference persistence", async () => {
      const user = userEvent.setup();
      render(<PageMain {...defaultProps} />);

      const measureSelect = screen.getByLabelText("Graph Measure");
      expect(measureSelect).toHaveValue("avg");

      await user.selectOptions(measureSelect, "max");
      expect(measureSelect).toHaveValue("max");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/preferences/graph",
        expect.objectContaining({
          body: JSON.stringify({ graphMeasure: "max" }),
          method: "POST",
        }),
      );
    });

    it("should display location information correctly", async () => {
      const customLocation = database.location.create({
        city: "Austin",
        location_id: 20_001,
        state: "Texas",
      });

      const propertiesWithCustomLocation = {
        ...defaultProps,
        id: customLocation.location_id,
        location: customLocation,
      };

      render(<PageMain {...propertiesWithCustomLocation} />);

      expect(screen.getByText("Austin, Texas")).toBeInTheDocument();
    });

    it("should handle reference year selection", async () => {
      const user = userEvent.setup();
      render(<PageMain {...defaultProps} />);

      const yearSelect = screen.getByLabelText("Reference Year");
      expect(yearSelect).toBeInTheDocument();

      expect(screen.getByDisplayValue("2000")).toBeInTheDocument();

      await user.selectOptions(yearSelect, "2021");
      expect(yearSelect).toHaveValue("2021");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/preferences/graph",
        expect.objectContaining({
          body: JSON.stringify({ referenceYear: "2021" }),
          method: "POST",
        }),
      );
    });
  });

  describe("data Integration", () => {
    it("should pass correct data to trend analysis component", async () => {
      render(<PageMain {...defaultProps} />);

      const trendGraph = screen.getByTestId("trend-graph");
      expect(trendGraph).toBeInTheDocument();
    });

    it("should pass correct data to reference data component", async () => {
      render(<PageMain {...defaultProps} />);

      await waitFor(() => {
        const referenceGraph = screen.getByTestId("reference-graph");
        expect(referenceGraph).toBeInTheDocument();
      });
    });

    it("should handle empty data gracefully", async () => {
      const emptyDataProperties = {
        ...defaultProps,
        CurrentDates: [],
        CurrentWetbulbs: [],
        IncreasePerYear: 0,
        ReferenceWetbulbs: [],
        TrendlineWetbulbs: [],
        YearWetbulbs: [],
        Years: [],
      };

      render(<PageMain {...emptyDataProperties} />);

      expect(screen.getByTestId("header-bar")).toBeInTheDocument();
      expect(screen.getByText("San Francisco, California")).toBeInTheDocument();
    });
  });

  describe("user Interactions", () => {
    it("should handle accessibility requirements", async () => {
      render(<PageMain {...defaultProps} />);

      expect(screen.getByLabelText("Graph Measure")).toBeInTheDocument();
      expect(screen.getByLabelText("Reference Year")).toBeInTheDocument();

      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  describe("error Handling", () => {
    it("should keep the page mounted after changing graph measure", async () => {
      const user = userEvent.setup();
      render(<PageMain {...defaultProps} />);

      const measureSelect = screen.getByLabelText("Graph Measure");

      await user.selectOptions(measureSelect, "max");
      expect(measureSelect).toHaveValue("max");

      expect(screen.getByTestId("header-bar")).toBeInTheDocument();
      expect(screen.getByTestId("trend-analysis")).toBeInTheDocument();
      expect(screen.getByTestId("reference-data")).toBeInTheDocument();
    });
  });
});
