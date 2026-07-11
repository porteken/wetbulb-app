import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InvalidLocationError } from "../components/invalid-location-error";

describe("invalidLocationError", () => {
  it("renders the provided title and message", () => {
    render(
      <InvalidLocationError
        message="The requested location could not be found."
        title="Location not found"
      />,
    );

    expect(screen.getByText("Location not found")).toBeInTheDocument();
    expect(
      screen.getByText("The requested location could not be found."),
    ).toBeInTheDocument();
  });
});
