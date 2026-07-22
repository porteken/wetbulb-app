import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LocationNotFound from "../not-found";

import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...properties
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...properties}>
      {children}
    </a>
  ),
}));

describe("location not-found page", () => {
  it("renders the missing location message and return link", () => {
    render(<LocationNotFound />);

    expect(screen.getByText("Location not found")).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't find a location matching that URL."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
