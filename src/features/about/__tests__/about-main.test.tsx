import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...linkProperties }: any) => (
    <a href={href} {...linkProperties}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/header-bar", () => ({
  HeaderBar: mockFn<
    ({ LocationOptions }: { LocationOptions: unknown[] }) => React.ReactNode
  >(({ LocationOptions }: { LocationOptions: unknown[] }) => (
    <div data-testid="header-bar">
      HeaderBar with {LocationOptions.length} locations
    </div>
  )),
}));

import AboutMain from "../components/about-main";

const mockLocationOptions = [
  {
    items: [
      { key: 1, title: "New York, NY" },
      { key: 2, title: "Los Angeles, CA" },
    ],
    title: "Major Cities",
  },
  {
    items: [{ key: 3, title: "Chicago, IL" }],
    title: "Other Cities",
  },
];

const emptyLocationOptions: typeof mockLocationOptions = [];

describe("aboutMain", () => {
  it("should render the header bar and the main about layout", () => {
    render(<AboutMain LocationOptions={mockLocationOptions} />);

    const headerBar = screen.getByTestId("header-bar");
    expect(headerBar).toBeInTheDocument();
    expect(headerBar).toHaveTextContent("HeaderBar with 2 locations");

    const container = screen.getByRole("main");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("mx-auto", "px-4", "py-8");

    expect(
      screen.getByText(/purpose of the application/iu),
    ).toBeInTheDocument();

    const heading = screen.getByRole("heading", { name: "About" });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("sr-only");

    const wetbulbHeading = screen.getByRole("heading", {
      name: /what is wetbulb\?/iu,
    });
    expect(wetbulbHeading).toBeInTheDocument();
    expect(wetbulbHeading).toHaveClass(
      "text-primary",
      "text-sm",
      "font-semibold",
      "uppercase",
    );
  });

  it("should render the wetbulb explanation and supporting references", () => {
    render(<AboutMain LocationOptions={mockLocationOptions} />);

    const wetbulbDefinition = screen.getByText(
      /wet-bulb temperature is the lowest temperature air can reach/iu,
    );
    expect(wetbulbDefinition).toBeInTheDocument();
    expect(wetbulbDefinition).toHaveTextContent("evaporative cooling");
    expect(wetbulbDefinition).toHaveTextContent("sweating");

    const lowRiskLink = screen.getByRole("link", { name: /this research/iu });
    expect(lowRiskLink).toBeInTheDocument();
    expect(lowRiskLink).toHaveAttribute(
      "href",
      "https://escholarship.org/content/qt2xz601d0/qt2xz601d0.pdf",
    );
    expect(lowRiskLink).toHaveClass("text-primary");

    const exerciseSafetyLink = screen.getByRole("link", {
      name: /this exercise-safety guidance/iu,
    });
    expect(exerciseSafetyLink).toBeInTheDocument();
    expect(exerciseSafetyLink).toHaveAttribute(
      "href",
      "https://www.princetonmedicine.com/blog/wet-bulb-temperature-and-exercise-safety-what-you-need-to-know",
    );

    const limitLink = screen.getByRole("link", { name: /recent research/iu });
    expect(limitLink).toBeInTheDocument();
    expect(limitLink).toHaveAttribute(
      "href",
      "https://www.psu.edu/news/research/story/humans-cant-endure-temperatures-and-humidities-high-previously-thought",
    );

    const limitText = screen.getByText(/closer to\s*88°F/iu);
    expect(limitText).toBeInTheDocument();
  });

  it("should render the wetbulb index table with combined F and C ranges", () => {
    render(<AboutMain LocationOptions={mockLocationOptions} />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("None")).toBeInTheDocument();
    expect(within(table).getByText("< 68°F (< 20°C)")).toBeInTheDocument();
    expect(within(table).getByText("Low Risk")).toBeInTheDocument();
    expect(within(table).getByText("68–76°F (20–24°C)")).toBeInTheDocument();
    expect(within(table).getByText("Theoretical Limit")).toBeInTheDocument();
    expect(within(table).getByText("≥ 95°F (≥ 35°C)")).toBeInTheDocument();
  });

  it("should render without location options", () => {
    render(<AboutMain LocationOptions={emptyLocationOptions} />);

    const headerBar = screen.getByTestId("header-bar");
    expect(headerBar).toHaveTextContent("HeaderBar with 0 locations");
  });
});
