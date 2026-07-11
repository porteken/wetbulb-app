import "@testing-library/jest-dom";

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { ForecastControls } from "../forecast-controls";

describe("forecastControls", () => {
  it("renders the forecast toggle", () => {
    render(
      <ForecastControls
        enabled={false}
        onToggle={mockFn()}
        onYearsChange={mockFn()}
        yearsAhead={10}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Show Forecast" }),
    ).toBeInTheDocument();
  });

  it("hides years controls when forecast is disabled", () => {
    render(
      <ForecastControls
        enabled={false}
        onToggle={mockFn()}
        onYearsChange={mockFn()}
        yearsAhead={10}
      />,
    );

    expect(
      screen.queryByLabelText(/forecast .* year/iu),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("shows years controls when forecast is enabled", () => {
    render(
      <ForecastControls
        enabled={true}
        onToggle={mockFn()}
        onYearsChange={mockFn()}
        yearsAhead={10}
      />,
    );

    expect(
      screen.getByLabelText("Forecast 10 years ahead"),
    ).toBeInTheDocument();

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "5");
    expect(slider).toHaveAttribute("max", "75");
    expect(slider).toHaveAttribute("step", "1");
    expect(slider).toHaveValue("10");
  });

  it("calls onToggle with checked state when checkbox changes", () => {
    const onToggle = mockFn();

    render(
      <ForecastControls
        enabled={false}
        onToggle={onToggle}
        onYearsChange={mockFn()}
        yearsAhead={10}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Show Forecast" }));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("calls onYearsChange with a number when slider changes", () => {
    const onYearsChange = mockFn();

    render(
      <ForecastControls
        enabled={true}
        onToggle={mockFn()}
        onYearsChange={onYearsChange}
        yearsAhead={10}
      />,
    );

    fireEvent.change(screen.getByRole("slider"), { target: { value: "25" } });

    expect(onYearsChange).toHaveBeenCalledWith(25);
  });

  it("uses singular year label when yearsAhead is 1", () => {
    render(
      <ForecastControls
        enabled={true}
        onToggle={mockFn()}
        onYearsChange={mockFn()}
        yearsAhead={1}
      />,
    );

    expect(screen.getByLabelText("Forecast 1 year ahead")).toBeInTheDocument();
  });
});
