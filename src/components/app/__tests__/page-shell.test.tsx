import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PageShell } from "../page-shell";

import type { LocationOptionSection } from "@/types/types";

vi.mock("@/features/header-bar", () => ({
  HeaderBar: () => <header data-testid="header-bar" />,
}));

const emptyLocationOptions: LocationOptionSection[] = [];

describe("page shell", () => {
  it("renders a skip link that resolves to the main content landmark", () => {
    const { container } = render(
      <PageShell
        LocationOptions={emptyLocationOptions}
        mainClassName="page-main"
      >
        <h2>Dashboard</h2>
      </PageShell>,
    );

    const skipLink = screen.getByRole("link", {
      name: "Skip to main content",
    });
    const mainContent = screen.getByRole("main");

    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(mainContent).toHaveAttribute("id", "main-content");
    expect(container.querySelector(skipLink.getAttribute("href")!)).toBe(
      mainContent,
    );
  });
});
