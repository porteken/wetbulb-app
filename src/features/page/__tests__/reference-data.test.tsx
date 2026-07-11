import "@testing-library/jest-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
};

vi.mock("@/features/graph", () => ({
  GenerateReferenceGraph: mockFn().mockReturnValue(
    <div data-testid="mock-reference-graph">Reference Graph</div>,
  ),
}));

vi.mock("@/lib/api/fetch-client", () => ({
  FetchReferenceGraphData: mockFn().mockResolvedValue({
    dates: [new Date("2023-01-01"), new Date("2023-02-01")],
    wetbulbs: [10, 20],
  }),
}));

import { GenerateReferenceGraph } from "@/features/graph";
import { FetchReferenceGraphData } from "@/lib/api/fetch-client";

import { ReferenceData } from "../components/reference-data";

const defaultProps: React.ComponentProps<typeof ReferenceData> = {
  CurrentDates: [new Date("2023-06-01"), new Date("2023-06-02")],
  CurrentWetbulbs: [22, 24],
  id: 1,
  initialReferenceYear: "2000",
  onReferenceYearChange: mockFn(),
  referenceYear: "2000",
  ReferenceWetbulbs: [18, 20],
};

const testCurrentDates = [new Date("2025-01-01T00:00:00.000Z")];
const testCurrentWetbulbs = [22];
const testReferenceWetbulbs = [18];
const emptyDates: Date[] = [];
const emptyWetbulbs: number[] = [];

describe("referenceData", () => {
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

  it("should render reference graph controls and graph", async () => {
    const { container } = renderWithQueryClient(
      <ReferenceData {...defaultProps} />,
    );

    expect(screen.getByText("Reference Data")).toBeInTheDocument();
    expect(screen.getByLabelText("Reference Year")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("mock-reference-graph")).toBeInTheDocument();
    });

    expect(
      screen.getByTestId("reference-graph-scroll-region"),
    ).toBeInTheDocument();

    expect(container.querySelector("#reference-data-graph")).toHaveClass(
      "flex-1",
    );
    expect(container.querySelector("#reference-data-graph")).not.toHaveClass(
      "mt-auto",
    );
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

    renderWithQueryClient(<ReferenceData {...defaultProps} />);

    const toggle = screen.getByRole("button", { name: "Show Graph Legend" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await waitFor(() => {
      const calls = vi.mocked(GenerateReferenceGraph).mock.calls;
      expect(calls.at(-1)?.[0]).toStrictEqual(
        expect.objectContaining({
          isMobileViewport: true,
          showLegend: false,
        }),
      );
    });

    fireEvent.click(toggle);

    await waitFor(() => {
      const calls = vi.mocked(GenerateReferenceGraph).mock.calls;
      expect(calls.at(-1)?.[0]).toStrictEqual(
        expect.objectContaining({
          isMobileViewport: true,
          showLegend: true,
        }),
      );
    });
  });

  it("should notify the parent and fetch selected annual reference year data", async () => {
    const onReferenceYearChange = mockFn();
    const { rerender } = renderWithQueryClient(
      <ReferenceData
        {...defaultProps}
        onReferenceYearChange={onReferenceYearChange}
      />,
    );

    const referenceYear = screen.getByLabelText("Reference Year");
    fireEvent.change(referenceYear, { target: { value: "2001" } });

    expect(onReferenceYearChange).toHaveBeenCalledWith("2001");

    rerender(
      <ReferenceData
        {...defaultProps}
        onReferenceYearChange={onReferenceYearChange}
        referenceYear="2001"
      />,
    );

    await waitFor(() => {
      expect(FetchReferenceGraphData).toHaveBeenCalledWith("2001", 1, "Annual");
    });
  });

  it("should pass the current year using UTC-safe date handling", async () => {
    renderWithQueryClient(
      <ReferenceData
        {...defaultProps}
        CurrentDates={testCurrentDates}
        CurrentWetbulbs={testCurrentWetbulbs}
        ReferenceWetbulbs={testReferenceWetbulbs}
      />,
    );

    await waitFor(() => {
      const calls = vi.mocked(GenerateReferenceGraph).mock.calls;
      expect(calls.at(-1)?.[0]).toStrictEqual(
        expect.objectContaining({
          currentYear: 2025,
        }),
      );
    });
  });

  it("should refetch the initial reference year when the server snapshot is empty", async () => {
    renderWithQueryClient(
      <ReferenceData
        {...defaultProps}
        CurrentDates={emptyDates}
        CurrentWetbulbs={emptyWetbulbs}
        ReferenceWetbulbs={emptyWetbulbs}
      />,
    );

    await waitFor(() => {
      expect(FetchReferenceGraphData).toHaveBeenCalledWith("2000", 1, "Annual");
    });
  });
});
