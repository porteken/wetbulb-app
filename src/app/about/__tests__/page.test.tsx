import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAbout, mockDatabaseError, mockFetchLocations } = vi.hoisted(() => ({
  mockAbout: mockFn(({ LocationOptions }: { LocationOptions: unknown[] }) => (
    <div data-count={LocationOptions.length} data-testid="about-page" />
  )),
  mockDatabaseError: mockFn(
    ({ message, title }: { message: string; title: string }) => (
      <div data-testid="database-error">
        {title}:{message}
      </div>
    ),
  ),
  mockFetchLocations: mockFn(),
}));

vi.mock("@/features/about", () => ({
  default: mockAbout,
}));

vi.mock("@/components/app/database-error", () => ({
  DatabaseError: mockDatabaseError,
}));

vi.mock("@/lib/api/fetch-server", () => ({
  FetchLocations: mockFetchLocations,
}));

vi.mock("next/dynamic", () => ({
  default: mockFn(() => mockAbout),
}));

import Page from "../page";

describe("about page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the about feature with fetched location options", async () => {
    const locationOptions = [
      {
        items: [{ key: 1, title: "Boston" }],
        title: "Massachusetts",
      },
    ];

    mockFetchLocations.mockResolvedValue({
      LocationOptions: locationOptions,
    });

    render(await Page());

    expect(screen.getByTestId("about-page")).toHaveAttribute("data-count", "1");
    expect(mockAbout).toHaveBeenCalledWith(
      {
        LocationOptions: locationOptions,
      },
      undefined,
    );
  });

  it("renders the database error when fetching locations fails", async () => {
    mockFetchLocations.mockRejectedValue(new Error("db offline"));

    render(await Page());

    expect(screen.getByTestId("database-error")).toHaveTextContent(
      "Database Connection Error:Unable to connect to the database. Please try again later.",
    );
    expect(mockAbout).not.toHaveBeenCalled();
  });
});
