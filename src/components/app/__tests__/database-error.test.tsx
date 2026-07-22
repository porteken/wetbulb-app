import { reloadPage } from "@/utils/reload";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DatabaseError } from "../database-error";

vi.mock("@/utils/reload", () => ({
  reloadPage: mockFn(),
}));

describe("databaseError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default props", () => {
    render(<DatabaseError />);

    expect(screen.getByText("Database Connection Error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Unable to connect to the database. Please try again later.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Need help\?/u)).toBeInTheDocument();
    expect(screen.getByText(/Contact Kenneth Porter/u)).toBeInTheDocument();
    expect(screen.getByText("porteken@gmail.com")).toBeInTheDocument();
  });

  it("renders with custom title and message", () => {
    const customMessage = "Custom error message";
    const customTitle = "Custom Error Title";
    render(<DatabaseError message={customMessage} title={customTitle} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });

  it("hides contact info when showContactInfo is false", () => {
    render(<DatabaseError showContactInfo={false} />);

    expect(screen.queryByText(/Need help\?/u)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Contact Kenneth Porter/u),
    ).not.toBeInTheDocument();
  });

  it("calls location.reload when Try Again button is clicked", () => {
    render(<DatabaseError />);

    const tryAgainButton = screen.getByText("Try Again");
    fireEvent.click(tryAgainButton);

    expect(reloadPage).toHaveBeenCalled();
  });
});
