import { RankingsMain } from "@/features/rankings";
import {
  setRankingsWetbulbLevel,
  setRankingsSeason,
  setRankingsState,
  setRankingsYear,
} from "@/lib/actions/actions";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = mockFn();
const { mockHeaderBar } = vi.hoisted(() => ({
  mockHeaderBar: vi.fn<
    (properties: {
      compact?: boolean;
      LocationOptions?: unknown[];
    }) => React.ReactElement
  >(
    ({
      compact,
      LocationOptions,
    }: {
      compact?: boolean;
      LocationOptions?: unknown[];
    }) => (
      <div
        data-compact={compact === true ? "true" : "false"}
        data-testid="header-bar"
      >
        HeaderBar {compact === true ? "compact" : "full"} with{" "}
        {LocationOptions?.length ?? 0} locations
      </div>
    ),
  ),
}));

class MockSelectControl extends React.PureComponent<{
  data: Array<{ disabled?: boolean; label: string; value: string }>;
  disabled?: boolean;
  label?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
}> {
  private readonly handleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    this.props.onChange?.(event.target.value);
  };

  public render(): React.ReactNode {
    const { data, disabled, label, placeholder, value } = this.props;
    const testId = `${label?.toLowerCase().replaceAll(/\s/gu, "-") ?? "select"}-select`;

    return (
      <div>
        {label && <label htmlFor={testId}>{label}</label>}
        <select
          data-testid={testId}
          disabled={disabled}
          id={testId}
          onChange={this.handleChange}
          value={value}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {data.map((option) => (
            <option
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
}

class MockMultiSelectControl extends React.PureComponent<{
  data: Array<{ label: string; value: string }>;
  disabled?: boolean;
  label?: string;
  onChange?: (value: string[]) => void;
  placeholder?: string;
  value: string[];
}> {
  private readonly handleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedValues = [...event.target.selectedOptions].map(
      (option) => option.value,
    );
    this.props.onChange?.(selectedValues);
  };

  public render(): React.ReactNode {
    const { data, disabled, label, placeholder, value } = this.props;
    const testId = `${label?.toLowerCase().replaceAll(/\s/gu, "-") ?? "multi"}-select`;

    return (
      <div>
        {label && <label htmlFor={testId}>{label}</label>}
        <select
          data-testid={testId}
          disabled={disabled}
          id={testId}
          multiple
          onChange={this.handleChange}
          value={value}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {data.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
}

class MockPaginationControl extends React.PureComponent<{
  onChange: (value: number) => void;
  total: number;
  value: number;
}> {
  private readonly handleNext = () => {
    this.props.onChange(Math.min(this.props.total, this.props.value + 1));
  };

  private readonly handlePrevious = () => {
    this.props.onChange(Math.max(1, this.props.value - 1));
  };

  public render(): React.ReactNode {
    const { total, value } = this.props;

    return (
      <div data-testid="pagination">
        <button
          data-testid="prev-page"
          disabled={value <= 1}
          onClick={this.handlePrevious}
          type="button"
        >
          Previous
        </button>
        <span data-testid="current-page">{value}</span>
        <span data-testid="total-pages">{total}</span>
        <button
          data-testid="next-page"
          disabled={value >= total}
          onClick={this.handleNext}
          type="button"
        >
          Next
        </button>
      </div>
    );
  }
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockFn(),
    toString: () => "",
  }),
}));

vi.mock("@/lib/actions/actions", () => ({
  setRankingsWetbulbLevel: mockFn(),
  setRankingsSeason: mockFn(),
  setRankingsState: mockFn(),
  setRankingsYear: mockFn(),
}));

const { mockToast } = vi.hoisted(() => ({ mockToast: mockFn() }));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/features/header-bar", () => ({
  HeaderBar: mockHeaderBar,
}));

vi.mock("@/components/ui/select", () => ({
  Select: mockFn((props: React.ComponentProps<typeof MockSelectControl>) => (
    <MockSelectControl {...props} />
  )),
}));

vi.mock("@/components/ui/multi-select", () => ({
  MultiSelect: mockFn(
    (props: React.ComponentProps<typeof MockMultiSelectControl>) => (
      <MockMultiSelectControl {...props} />
    ),
  ),
}));

vi.mock("@/components/ui/pagination", () => ({
  Pagination: mockFn(
    (props: React.ComponentProps<typeof MockPaginationControl>) => (
      <MockPaginationControl {...props} />
    ),
  ),
}));

const mockLocationOptions = [
  {
    items: [
      { key: 1, title: "New York, NY" },
      { key: 2, title: "Los Angeles, CA" },
    ],
    title: "Major Cities",
  },
];

const createMockRankingItem = (overrides = {}) => ({
  avg_wetbulb: 25,
  changeFrom2000: 0.5,
  city: "Test City",
  FutureValueLower: 25,
  FutureValueUpper: 30,
  location_id: 1,
  max_wetbulb: 30,
  p5: 19,
  p95: 26,
  rank: 1,
  state: "TX",
  ...overrides,
});

const mockRankings = [
  createMockRankingItem({
    avg_wetbulb: 22.5,
    city: "Austin",
    location_id: 1,
    max_wetbulb: 26.9,
    rank: 1,
    state: "TX",
  }),
  createMockRankingItem({
    avg_wetbulb: 24.4,
    city: "Dallas",
    location_id: 2,
    max_wetbulb: 28.9,
    rank: 2,
    state: "TX",
  }),
  createMockRankingItem({
    avg_wetbulb: 26.7,
    city: "Houston",
    location_id: 3,
    max_wetbulb: 31.1,
    rank: 3,
    state: "TX",
  }),
  createMockRankingItem({
    avg_wetbulb: 29.4,
    city: "Phoenix",
    location_id: 4,
    max_wetbulb: 33.9,
    rank: 4,
    state: "AZ",
  }),
  createMockRankingItem({
    avg_wetbulb: 30.6,
    city: "Tucson",
    location_id: 5,
    max_wetbulb: 35,
    rank: 5,
    state: "AZ",
  }),
  createMockRankingItem({
    avg_wetbulb: 32.2,
    city: "Miami",
    location_id: 6,
    max_wetbulb: 36.7,
    rank: 6,
    state: "FL",
  }),
  createMockRankingItem({
    avg_wetbulb: 31.4,
    city: "Orlando",
    location_id: 7,
    max_wetbulb: 35.8,
    rank: 7,
    state: "FL",
  }),
  createMockRankingItem({
    avg_wetbulb: 19.4,
    city: "Denver",
    location_id: 8,
    max_wetbulb: 23.9,
    rank: 8,
    state: "CO",
  }),
  createMockRankingItem({
    avg_wetbulb: 18.3,
    city: "Boulder",
    location_id: 9,
    max_wetbulb: 22.8,
    rank: 9,
    state: "CO",
  }),
  createMockRankingItem({
    avg_wetbulb: 22.5,
    city: "Chicago",
    location_id: 10,
    max_wetbulb: 26.9,
    rank: 10,
    state: "IL",
  }),
  createMockRankingItem({
    avg_wetbulb: 21.4,
    city: "Springfield",
    location_id: 11,
    max_wetbulb: 25.8,
    rank: 11,
    state: "IL",
  }),
  createMockRankingItem({
    avg_wetbulb: 16.4,
    city: "Seattle",
    location_id: 12,
    max_wetbulb: 20.8,
    rank: 12,
    state: "WA",
  }),
  createMockRankingItem({
    avg_wetbulb: 17.5,
    city: "Spokane",
    location_id: 13,
    max_wetbulb: 21.9,
    rank: 13,
    state: "WA",
  }),
  createMockRankingItem({
    avg_wetbulb: 16.9,
    city: "Portland",
    location_id: 14,
    max_wetbulb: 21.4,
    rank: 14,
    state: "OR",
  }),
  createMockRankingItem({
    avg_wetbulb: 15.8,
    city: "Eugene",
    location_id: 15,
    max_wetbulb: 20.3,
    rank: 15,
    state: "OR",
  }),
  createMockRankingItem({
    avg_wetbulb: 20.6,
    city: "Boston",
    location_id: 16,
    max_wetbulb: 25,
    rank: 16,
    state: "MA",
  }),
  createMockRankingItem({
    avg_wetbulb: 21.1,
    city: "Cambridge",
    location_id: 17,
    max_wetbulb: 25.6,
    rank: 17,
    state: "MA",
  }),
  createMockRankingItem({
    avg_wetbulb: 23.3,
    city: "New York",
    location_id: 18,
    max_wetbulb: 27.8,
    rank: 18,
    state: "NY",
  }),
  createMockRankingItem({
    avg_wetbulb: 21.9,
    city: "Buffalo",
    location_id: 19,
    max_wetbulb: 26.4,
    rank: 19,
    state: "NY",
  }),
  createMockRankingItem({
    avg_wetbulb: 25.6,
    city: "Los Angeles",
    location_id: 20,
    max_wetbulb: 30,
    rank: 20,
    state: "CA",
  }),
  createMockRankingItem({
    avg_wetbulb: 22.8,
    city: "San Francisco",
    location_id: 21,
    max_wetbulb: 27.2,
    rank: 21,
    state: "CA",
  }),
  createMockRankingItem({
    avg_wetbulb: 25,
    city: "San Diego",
    location_id: 22,
    max_wetbulb: 29.4,
    rank: 22,
    state: "CA",
  }),
];

const hotCityRankings = [
  createMockRankingItem({ changeFrom2000: 1.5, city: "Hot City" }),
];

const coolCityRankings = [
  createMockRankingItem({ changeFrom2000: -0.5, city: "Cool City" }),
];

const noDataCityRankings = [
  createMockRankingItem({ changeFrom2000: undefined, city: "No Data City" }),
];

const rangeCityRankings = [
  createMockRankingItem({ city: "Range City", p5: 18, p95: 25 }),
];

const futureCityRankings = [
  createMockRankingItem({
    city: "Future City",
    FutureValueLower: 25,
    FutureValueUpper: 32,
  }),
];

const noFutureCityRankings = [
  createMockRankingItem({
    city: "No Future City",
    FutureValueLower: undefined,
    FutureValueUpper: undefined,
  }),
];

const stableCityRankings = [
  createMockRankingItem({ changeFrom2000: 0, city: "Stable City" }),
];

const extremeHeatCityRankings = [
  createMockRankingItem({
    avg_wetbulb: 36,
    city: "Extreme Heat City",
    location_id: 23,
    max_wetbulb: 40,
  }),
];

const mockRankingsWithExtremeHeat = [
  ...mockRankings,
  ...extremeHeatCityRankings,
];

const emptyRankings: Array<ReturnType<typeof createMockRankingItem>> = [];
const topFiveRankings = mockRankings.slice(0, 5);

const defaultProps = {
  initialWetbulbLevel: "",
  initialSeason: "Annual" as const,
  initialState: "",
  initialYear: 2020,
  LocationOptions: mockLocationOptions,
  rankings: mockRankings,
  region: "na" as const,
  shouldPersistInitialSeason: false,
};

const requireElement = <T extends Element>(element: null | T): T => {
  expect(element).not.toBeNull();
  return element as T;
};

describe("rankingsMain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
  });

  describe("basic Rendering", () => {
    it("should render the component", () => {
      render(<RankingsMain {...defaultProps} />);

      expect(screen.getByTestId("header-bar")).toBeInTheDocument();
      expect(
        screen.getByText("Cities ranked by Average Wetbulb"),
      ).toBeInTheDocument();
    });

    it("should use the full header layout so the city selector remains visible", () => {
      render(<RankingsMain {...defaultProps} />);

      expect(screen.getByTestId("header-bar")).toHaveAttribute(
        "data-compact",
        "false",
      );
    });

    it("should render the year select", () => {
      render(<RankingsMain {...defaultProps} />);

      expect(screen.getByTestId("year-select")).toBeInTheDocument();
    });

    it("should render state and wetbulb level filters", () => {
      render(<RankingsMain {...defaultProps} />);

      expect(screen.getByTestId("season-select")).toBeInTheDocument();
      expect(screen.getByTestId("state/province-select")).toBeInTheDocument();
      expect(
        screen.getByTestId("avg-wetbulb-level-select"),
      ).toBeInTheDocument();
    });

    it("should render the wetbulb index legend", () => {
      render(<RankingsMain {...defaultProps} />);

      expect(screen.getByText("Wetbulb Index")).toBeInTheDocument();
      const legendSection = requireElement(
        screen.getByText("Wetbulb Index").closest("div"),
      );
      expect(within(legendSection).getByText("None")).toBeInTheDocument();
      expect(within(legendSection).getByText("Low Risk")).toBeInTheDocument();
      expect(
        within(legendSection).getByText("Moderate Risk"),
      ).toBeInTheDocument();
      expect(within(legendSection).getByText("High Risk")).toBeInTheDocument();
      expect(
        within(legendSection).getByText("Extreme Risk"),
      ).toBeInTheDocument();
      expect(
        within(legendSection).getByText("Empirical Limit"),
      ).toBeInTheDocument();
      expect(
        within(legendSection).getByText("Theoretical Limit"),
      ).toBeInTheDocument();
    });

    it("should render table headers", () => {
      render(<RankingsMain {...defaultProps} />);

      const table = screen.getByRole("table");
      expect(within(table).getByText("Rank")).toBeInTheDocument();
      expect(within(table).getByText("City")).toBeInTheDocument();
      expect(within(table).getByText("Avg Wetbulb")).toBeInTheDocument();
      expect(within(table).getByText("Max Wetbulb")).toBeInTheDocument();
      expect(
        within(table).getByText("Wetbulb Range (5th-95th percentile)"),
      ).toBeInTheDocument();
      expect(within(table).getByText("Change from 2000")).toBeInTheDocument();
      expect(
        within(table).getByText("2100 Forecast Range"),
      ).toBeInTheDocument();
    });

    it("should render ranking items", () => {
      render(<RankingsMain {...defaultProps} />);

      expect(screen.getByText("Austin")).toBeInTheDocument();
      expect(screen.getByText("Dallas")).toBeInTheDocument();
    });
  });

  describe("year Selection", () => {
    it("should initialize with the initial year", () => {
      render(<RankingsMain {...defaultProps} />);

      const yearSelect = screen.getByTestId("year-select");
      expect(yearSelect).toHaveValue("2020");
    });

    it("always shows the current year regardless of the selected season", () => {
      render(<RankingsMain {...defaultProps} initialSeason="Annual" />);

      expect(
        within(screen.getByTestId("year-select")).getByText("2026"),
      ).toBeEnabled();
    });

    it("should call setRankingsYear when year changes", async () => {
      render(<RankingsMain {...defaultProps} />);

      const yearSelect = screen.getByTestId("year-select");
      fireEvent.change(yearSelect, { target: { value: "2025" } });

      await waitFor(() => {
        expect(setRankingsYear).toHaveBeenCalledWith(2025);
      });
    });

    it("should call setRankingsSeason when season changes", async () => {
      render(<RankingsMain {...defaultProps} />);

      const seasonSelect = screen.getByTestId("season-select");
      fireEvent.change(seasonSelect, { target: { value: "Winter" } });

      await waitFor(() => {
        expect(setRankingsSeason).toHaveBeenCalledWith("Winter");
      });
    });

    it("disables seasons with insufficient data for the current year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-28T12:00:00Z"));

      render(
        <RankingsMain
          {...defaultProps}
          initialSeason="Summer"
          initialYear={2026}
        />,
      );

      const seasonSelect = screen.getByTestId("season-select");
      expect(within(seasonSelect).getByText("Spring")).toBeInTheDocument();
      expect(within(seasonSelect).getByText("Summer")).toBeInTheDocument();
      expect(
        within(seasonSelect).getByText("Annual (Insufficient data)"),
      ).toBeDisabled();
      expect(
        within(seasonSelect).getByText("Fall (Insufficient data)"),
      ).toBeDisabled();
      expect(
        within(seasonSelect).getByText("Winter (Insufficient data)"),
      ).toBeDisabled();

      vi.useRealTimers();
    });

    it("should persist the default annual season when requested", async () => {
      render(
        <RankingsMain
          {...defaultProps}
          initialSeason="Annual"
          shouldPersistInitialSeason
        />,
      );

      await waitFor(() => {
        expect(setRankingsSeason).toHaveBeenCalledWith("Annual");
      });
    });
  });

  describe("state Filtering", () => {
    it("should show all states in the filter dropdown", () => {
      render(<RankingsMain {...defaultProps} />);

      expect(
        screen.getByRole("option", { name: "All states/provinces" }),
      ).toBeVisible();
    });

    it("should filter rankings by state", () => {
      render(<RankingsMain {...defaultProps} />);

      expect(screen.getByText("Austin")).toBeInTheDocument();
      expect(screen.getByText("Phoenix")).toBeInTheDocument();

      const stateSelect = screen.getByTestId("state/province-select");
      fireEvent.change(stateSelect, { target: { value: "TX" } });

      expect(screen.getByText("Austin")).toBeInTheDocument();
    });

    it("should filter rankings by multiple states", () => {
      render(<RankingsMain {...defaultProps} />);

      const stateSelect = screen.getByTestId("state/province-select");
      for (const value of ["TX", "AZ"]) {
        const option = stateSelect.querySelector<HTMLOptionElement>(
          `option[value="${value}"]`,
        );
        if (option) option.selected = true;
      }
      fireEvent.change(stateSelect);

      expect(screen.getByText("Austin")).toBeInTheDocument();
      expect(screen.getByText("Phoenix")).toBeInTheDocument();
      expect(screen.queryByText("Seattle")).not.toBeInTheDocument();
      expect(setRankingsState).toHaveBeenCalledWith("AZ,TX");
    });
  });

  describe("wetbulb Level Filtering", () => {
    it("should include Theoretical Limit level when it exists in average wetbulb rows", () => {
      render(
        <RankingsMain
          {...defaultProps}
          rankings={mockRankingsWithExtremeHeat}
        />,
      );

      const wetbulbLevelSelect = screen.getByTestId("avg-wetbulb-level-select");

      expect(
        within(wetbulbLevelSelect).getByRole("option", {
          name: "Theoretical Limit",
        }),
      ).toBeInTheDocument();
    });

    it("should filter rankings by wetbulb level", () => {
      render(<RankingsMain {...defaultProps} />);

      const wetbulbLevelSelect = screen.getByTestId("avg-wetbulb-level-select");
      fireEvent.change(wetbulbLevelSelect, {
        target: { value: "None" },
      });

      expect(screen.getByText("Seattle")).toBeInTheDocument();
    });

    it("should filter rankings by multiple wetbulb levels", () => {
      render(<RankingsMain {...defaultProps} />);

      const wetbulbLevelSelect = screen.getByTestId("avg-wetbulb-level-select");
      for (const value of ["None", "Extreme Risk"]) {
        const option = wetbulbLevelSelect.querySelector<HTMLOptionElement>(
          `option[value="${value}"]`,
        );
        if (option) option.selected = true;
      }
      fireEvent.change(wetbulbLevelSelect);

      expect(screen.getByText("Seattle")).toBeInTheDocument();
      expect(screen.getByText("Phoenix")).toBeInTheDocument();
      expect(setRankingsWetbulbLevel).toHaveBeenCalledWith("None,Extreme Risk");
    });
  });

  describe("sorting", () => {
    it("should sort by rank by default", () => {
      render(<RankingsMain {...defaultProps} />);

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Miami");
    });

    it("should sort by city when city header is clicked", () => {
      render(<RankingsMain {...defaultProps} />);

      const table = screen.getByRole("table");
      const cityHeader = requireElement(
        within(table).getByText("City").closest("th"),
      );
      fireEvent.click(within(cityHeader).getByRole("button"));

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Austin");
    });

    it("should show sort indicator when column is clicked", () => {
      render(<RankingsMain {...defaultProps} />);

      const table = screen.getByRole("table");
      const cityHeader = requireElement(
        within(table).getByText("City").closest("th"),
      );
      fireEvent.click(within(cityHeader).getByRole("button"));

      expect(within(cityHeader).getByText("↑")).toBeInTheDocument();
    });

    it("should sort by avg_wetbulb when Avg Wetbulb header is clicked", () => {
      render(<RankingsMain {...defaultProps} />);

      const table = screen.getByRole("table");
      const avgWetbulbHeader = requireElement(
        within(table).getByText("Avg Wetbulb").closest("th"),
      );
      fireEvent.click(within(avgWetbulbHeader).getByRole("button"));

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Eugene");
    });

    it("should sort by state when State/Province header is clicked", () => {
      render(<RankingsMain {...defaultProps} />);

      const table = screen.getByRole("table");
      const stateHeader = requireElement(
        within(table).getByText("State/Province").closest("th"),
      );
      fireEvent.click(within(stateHeader).getByRole("button"));

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("AZ");
    });

    it("should sort by change when Change from 2000 header is clicked", () => {
      render(<RankingsMain {...defaultProps} />);

      const table = screen.getByRole("table");
      const changeHeader = requireElement(
        within(table).getByText("Change from 2000").closest("th"),
      );
      fireEvent.click(changeHeader);

      expect(changeHeader).toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    it("should display pagination when there are multiple pages", () => {
      render(<RankingsMain {...defaultProps} rankings={mockRankings} />);

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("should not display pagination when there is only one page", () => {
      render(
        <RankingsMain {...defaultProps} rankings={mockRankings.slice(0, 10)} />,
      );

      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });

    it("should change page when pagination is used", () => {
      render(<RankingsMain {...defaultProps} rankings={mockRankings} />);

      fireEvent.click(screen.getByTestId("next-page"));

      expect(screen.getByTestId("current-page")).toHaveTextContent("2");
    });

    it("should display showing text with correct counts", () => {
      render(<RankingsMain {...defaultProps} rankings={mockRankings} />);

      expect(screen.getByText(/Showing/u)).toBeInTheDocument();
      expect(screen.getByText(/of 22 cities/u)).toBeInTheDocument();
    });

    it("should reset to page 1 when filters change", () => {
      render(<RankingsMain {...defaultProps} rankings={mockRankings} />);

      fireEvent.click(screen.getByTestId("next-page"));
      expect(screen.getByTestId("current-page")).toHaveTextContent("2");

      const wetbulbLevelSelect = screen.getByTestId("avg-wetbulb-level-select");
      fireEvent.change(wetbulbLevelSelect, {
        target: { value: "Empirical Limit" },
      });

      expect(screen.getByText(/Showing/u)).toBeInTheDocument();
    });
  });

  describe("row Click Navigation", () => {
    it("should navigate to location page when row is clicked", () => {
      render(<RankingsMain {...defaultProps} />);

      const row = requireElement(screen.getByText("Austin").closest("tr"));
      fireEvent.click(row);

      expect(mockPush).toHaveBeenCalledWith("/1");
    });
  });

  describe("data Display", () => {
    it("should display change from 2000 with positive indicator", () => {
      render(<RankingsMain {...defaultProps} rankings={hotCityRankings} />);

      expect(screen.getByText("+2.7°F")).toBeInTheDocument();
    });

    it("should display change from 2000 with negative indicator", () => {
      render(<RankingsMain {...defaultProps} rankings={coolCityRankings} />);

      expect(screen.getByText("-0.9°F")).toBeInTheDocument();
    });

    it("should display N/A for undefined change from 2000", () => {
      render(<RankingsMain {...defaultProps} rankings={noDataCityRankings} />);

      const naElements = screen.getAllByText("N/A");
      expect(naElements.length).toBeGreaterThan(0);
    });

    it("should display WETBULB range correctly", () => {
      render(<RankingsMain {...defaultProps} rankings={rangeCityRankings} />);

      expect(screen.getByText("64.4-77.0°F")).toBeInTheDocument();
    });

    it("should display 2100 forecast range when available", () => {
      render(<RankingsMain {...defaultProps} rankings={futureCityRankings} />);

      expect(screen.getByText("77.0")).toBeInTheDocument();
      expect(screen.getByText("89.6°F")).toBeInTheDocument();
    });

    it("should display N/A for undefined 2100 forecast", () => {
      render(
        <RankingsMain {...defaultProps} rankings={noFutureCityRankings} />,
      );

      const naElements = screen.getAllByText("N/A");
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  describe("empty State", () => {
    it("should handle empty rankings array", () => {
      render(<RankingsMain {...defaultProps} rankings={emptyRankings} />);

      expect(
        screen.getByText("Cities ranked by Average Wetbulb"),
      ).toBeInTheDocument();
      expect(screen.getByText(/Showing 0/u)).toBeInTheDocument();
    });

    it("should show no results message when filter excludes all", () => {
      render(<RankingsMain {...defaultProps} rankings={topFiveRankings} />);

      expect(screen.getByText(/Showing 1-5 of 5 cities/u)).toBeInTheDocument();
    });
  });

  describe("helper Functions", () => {
    it("should apply correct color for positive change values", () => {
      render(<RankingsMain {...defaultProps} rankings={hotCityRankings} />);

      const changeCell = screen.getByText("+2.7°F");
      expect(changeCell).toHaveClass("text-red-600");
    });

    it("should apply correct color for negative change values", () => {
      render(<RankingsMain {...defaultProps} rankings={coolCityRankings} />);

      const changeCell = screen.getByText("-0.9°F");
      expect(changeCell).toHaveClass("text-blue-600");
    });

    it("should apply correct color for zero change values", () => {
      render(<RankingsMain {...defaultProps} rankings={stableCityRankings} />);

      const changeCell = screen.getByText("0.0°F");
      expect(changeCell).toHaveClass("text-muted-foreground");
    });
  });

  describe("filter Combination", () => {
    it("should apply state filter correctly", () => {
      render(<RankingsMain {...defaultProps} />);

      const stateSelect = screen.getByTestId("state/province-select");
      fireEvent.change(stateSelect, { target: { value: "AZ" } });

      expect(screen.getByText("Phoenix")).toBeInTheDocument();
      expect(screen.queryByText("Austin")).not.toBeInTheDocument();
    });
  });

  describe("filter Reset", () => {
    it("should clear the wetbulb level filter when season changes", async () => {
      render(
        <RankingsMain
          {...defaultProps}
          initialWetbulbLevel="None"
          initialState="TX"
          rankings={mockRankings}
        />,
      );

      const stateSelect = screen.getByTestId("state/province-select");
      const seasonSelect = screen.getByTestId("season-select");

      expect(
        screen.getByText("No cities match the current filters."),
      ).toBeInTheDocument();

      fireEvent.change(seasonSelect, { target: { value: "Winter" } });

      await waitFor(() => {
        expect(setRankingsWetbulbLevel).toHaveBeenCalledWith("");
        expect(setRankingsSeason).toHaveBeenCalledWith("Winter");
      });

      expect(stateSelect).toHaveValue(["TX"]);
      expect(screen.getByText("Austin")).toBeInTheDocument();
      expect(
        screen.queryByText("No cities match the current filters."),
      ).not.toBeInTheDocument();
    });

    it("should clear the wetbulb level filter when year changes", async () => {
      render(
        <RankingsMain
          {...defaultProps}
          initialWetbulbLevel="None"
          initialState="TX"
          rankings={mockRankings}
        />,
      );

      const stateSelect = screen.getByTestId("state/province-select");
      const yearSelect = screen.getByTestId("year-select");

      expect(
        screen.getByText("No cities match the current filters."),
      ).toBeInTheDocument();

      fireEvent.change(yearSelect, { target: { value: "2025" } });

      await waitFor(() => {
        expect(setRankingsWetbulbLevel).toHaveBeenCalledWith("");
        expect(setRankingsYear).toHaveBeenCalledWith(2025);
      });

      expect(stateSelect).toHaveValue(["TX"]);
      expect(yearSelect).toHaveValue("2025");
      expect(screen.getByText("Austin")).toBeInTheDocument();
      expect(
        screen.queryByText("No cities match the current filters."),
      ).not.toBeInTheDocument();
    });

    it("should reset page to 1 when sort column changes", () => {
      render(<RankingsMain {...defaultProps} rankings={mockRankings} />);

      fireEvent.click(screen.getByTestId("next-page"));
      expect(screen.getByTestId("current-page")).toHaveTextContent("2");

      const table = screen.getByRole("table");
      const cityHeader = requireElement(
        within(table).getByText("City").closest("th"),
      );
      fireEvent.click(within(cityHeader).getByRole("button"));

      expect(screen.getByTestId("current-page")).toHaveTextContent("1");
    });
  });
});
