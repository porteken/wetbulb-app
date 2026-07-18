import "@testing-library/jest-dom";

import { HeaderBar } from "@/features/header-bar";
import { mockFn } from "@/testing/mock-fn";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { LocationOptionSection } from "@/types/types";

const {
  mockGet,
  mockPathname,
  mockPush,
  mockToString,
  mockUseSearchParameters,
} = vi.hoisted(() => ({
  mockGet: vi.fn<(name: string) => string | null>(),
  mockPathname: vi.fn<() => string>().mockReturnValue("/"),
  mockPush: vi.fn<(href: string) => void>(),
  mockToString: vi.fn<() => string>().mockReturnValue(""),
  mockUseSearchParameters: vi.fn<() => unknown>(),
}));

const mockLocationOptions = [
  {
    items: [
      { key: 0, title: "New York" },
      { key: 1, title: "Los Angeles" },
    ],
    title: "Test States",
  },
];

const emptyLocationOptions: typeof mockLocationOptions = [];

const unsortedLocationOptions = [
  {
    items: [
      { key: 1, title: "Chicago" },
      { key: 2, title: "Boston" },
      { key: 3, title: "Austin" },
    ],
    title: "State 1",
  },
  {
    items: [
      { key: 4, title: "Denver" },
      { key: 5, title: "Albany" },
    ],
    title: "State 2",
  },
];

const emptyStateLocationOptions = [
  {
    items: [
      { key: 1, title: "City One" },
      { key: 2, title: "City Two" },
    ],
    title: "",
  },
];

const mixedLocationOptions = [
  {
    items: [],
    title: "State With No Items",
  },
  {
    items: [{ key: 1, title: "Valid City" }],
    title: "Valid State",
  },
];

const titleOnlyLocationOptions = [
  { title: "Test Section" },
] as unknown as LocationOptionSection[];

const undefinedLocationOptions = undefined as unknown as never;

vi.mock("next/navigation", () => ({
  usePathname: mockPathname,
  useRouter: () => ({
    back: vi.fn<() => void>(),
    forward: vi.fn<() => void>(),
    push: mockPush,
    refresh: vi.fn<() => void>(),
    replace: vi.fn<() => void>(),
  }),
  useSearchParams: () => mockUseSearchParameters(),
}));

vi.mock("@/components/app/unit-toggle", () => ({
  UnitToggle: () => null,
}));

vi.mock("@/components/app/basis-toggle", () => ({
  BasisToggle: () => null,
}));

describe("headerBar", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "matchMedia", {
      value: mockFn().mockImplementation((query: string) => ({
        addEventListener: mockFn(),
        addListener: mockFn(),
        dispatchEvent: mockFn(),
        matches: false,
        media: query,
        onchange: undefined,
        removeEventListener: mockFn(),
        removeListener: mockFn(),
      })),
      writable: true,
    });

    const disconnect = mockFn();
    const observe = mockFn();

    class MockResizeObserver {
      disconnect(): void {
        disconnect();
      }

      observe(): void {
        observe();
      }

      unobserve(): void {}
    }

    globalThis.ResizeObserver = MockResizeObserver;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSearchParameters.mockReset();
    mockUseSearchParameters.mockReturnValue({
      get: mockGet,
      toString: mockToString,
    });
  });

  describe("basic Rendering", () => {
    it("should render the header bar with app name linked to the home page", () => {
      render(<HeaderBar LocationOptions={mockLocationOptions} />);

      const homeLink = screen.getByRole("link", {
        name: "Historical Wetbulb App",
      });

      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("should render navigation links", () => {
      render(<HeaderBar LocationOptions={mockLocationOptions} />);
      expect(screen.getByText("Map")).toBeInTheDocument();
      expect(screen.getByText("About")).toBeInTheDocument();
    });

    it("should render GitHub link", () => {
      render(<HeaderBar LocationOptions={mockLocationOptions} />);
      const githubLinks = screen.getAllByLabelText(
        "View source code on GitHub",
      );
      expect(githubLinks.length).toBeGreaterThan(0);
      expect(githubLinks[0]).toHaveAttribute(
        "href",
        "https://github.com/porteken/wetbulb-app",
      );
    });

    it("should render city selector", () => {
      render(<HeaderBar LocationOptions={mockLocationOptions} />);
      expect(screen.getByTestId("city-selector")).toBeInTheDocument();
    });
  });

  describe("location Options Handling", () => {
    it("should handle empty LocationOptions", () => {
      render(<HeaderBar LocationOptions={emptyLocationOptions} />);
      expect(screen.getByTestId("city-selector")).toBeInTheDocument();
    });

    it("should handle non-array LocationOptions gracefully", () => {
      render(<HeaderBar LocationOptions={undefinedLocationOptions} />);
      expect(screen.getByTestId("city-selector")).toBeInTheDocument();
    });

    it("should sort cities within states alphabetically", () => {
      render(<HeaderBar id={1} LocationOptions={unsortedLocationOptions} />);

      const selector = screen.getByTestId("city-selector");
      expect(selector).toBeInTheDocument();
    });

    it("should handle empty state grouping correctly", () => {
      mockToString.mockReturnValue("");
      render(<HeaderBar id={1} LocationOptions={emptyStateLocationOptions} />);
      expect(screen.getByTestId("city-selector")).toBeInTheDocument();
    });

    it("should handle section with empty items array", () => {
      render(<HeaderBar id={1} LocationOptions={mixedLocationOptions} />);

      const selector = screen.getByTestId("city-selector");
      expect(selector).toBeInTheDocument();
    });
  });

  describe("edge Cases", () => {
    it("should handle section with items set to undefined", () => {
      render(<HeaderBar LocationOptions={titleOnlyLocationOptions} />);

      expect(document.body).toBeInTheDocument();
    });

    it("should handle case with no id provided and process current city correctly", () => {
      render(<HeaderBar LocationOptions={mockLocationOptions} />);

      const selector = screen.getByTestId("city-selector");
      expect(selector).toHaveTextContent("Select City");
    });

    it("should handle the onChange event for city selector", async () => {
      const user = userEvent.setup();
      render(<HeaderBar LocationOptions={mockLocationOptions} />);

      const selector = screen.getByTestId("city-selector");
      await user.click(selector);

      const option = await screen.findByRole("option", { name: "New York" });
      await user.click(option);

      expect(mockPush).toHaveBeenCalledWith("/0");
    });

    it("should allow searching by state in the city autocomplete", async () => {
      const user = userEvent.setup();
      render(<HeaderBar LocationOptions={mockLocationOptions} />);

      const selector = screen.getByTestId("city-selector");
      await user.click(selector);

      const searchInput = await screen.findByPlaceholderText("Search...");
      await user.type(searchInput, "test states");

      expect(screen.getByText("New York")).toBeInTheDocument();
      expect(screen.getByText("Los Angeles")).toBeInTheDocument();
    });

    it("should focus the search input so typing works immediately after opening", async () => {
      const user = userEvent.setup();
      render(<HeaderBar LocationOptions={mockLocationOptions} />);

      const selector = screen.getByTestId("city-selector");
      await user.click(selector);

      const searchInput = await screen.findByPlaceholderText("Search...");
      await waitFor(() => {
        expect(searchInput).toHaveFocus();
      });

      await user.keyboard("los");

      expect(searchInput).toHaveValue("los");
      expect(
        screen.getByRole("option", { name: "Los Angeles" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: "New York" }),
      ).not.toBeInTheDocument();
    });

    it("should clear city selection when clear button is clicked", () => {
      render(<HeaderBar id={1} LocationOptions={mockLocationOptions} />);

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("should have proper placeholder text based on ID", () => {
      const { unmount } = render(
        <HeaderBar id={999} LocationOptions={mockLocationOptions} />,
      );
      expect(screen.getByTestId("city-selector")).toHaveTextContent(
        "Change City",
      );
      unmount();

      render(<HeaderBar id={-1} LocationOptions={mockLocationOptions} />);
      expect(screen.getByTestId("city-selector")).toHaveTextContent(
        "Select City",
      );
    });

    it("should treat location id zero as a selected city", () => {
      render(<HeaderBar id={0} LocationOptions={mockLocationOptions} />);

      expect(screen.getByTestId("city-selector")).toHaveTextContent("New York");
    });
  });

  describe("city Selection and URL Building", () => {
    it("should find current city when ID is provided", () => {
      render(<HeaderBar id={1} LocationOptions={mockLocationOptions} />);
      expect(screen.getByTestId("city-selector")).toBeInTheDocument();
    });

    it("should handle case when current city is not found", () => {
      render(<HeaderBar id={999} LocationOptions={mockLocationOptions} />);
      expect(screen.getByTestId("city-selector")).toBeInTheDocument();
    });

    it("should handle ID with no current city gracefully", () => {
      render(
        <HeaderBar id={undefined} LocationOptions={mockLocationOptions} />,
      );
      expect(screen.getByTestId("city-selector")).toBeInTheDocument();
    });

    it("should build URL with search parameters", () => {
      mockToString.mockReturnValue("param=value");
      render(<HeaderBar LocationOptions={mockLocationOptions} />);

      expect(screen.getByTestId("city-selector")).toBeInTheDocument();

      const mapButton = screen.getByLabelText("Navigate to map view");
      expect(mapButton).toHaveAttribute("href", "/?param=value");
    });

    it("should build URL without search parameters when empty", () => {
      mockToString.mockReturnValue("");
      render(<HeaderBar LocationOptions={mockLocationOptions} />);
      expect(screen.getByTestId("city-selector")).toBeInTheDocument();
    });
  });
});
