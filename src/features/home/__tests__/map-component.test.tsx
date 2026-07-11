import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MapComponent } from "../components/map-component";

const { mockUseTheme } = vi.hoisted(() => ({
  mockUseTheme: mockFn(() => ({ resolvedTheme: "light" })),
}));

vi.mock("next-themes", () =>
  Object.fromEntries([["useTheme", () => mockUseTheme()]]),
);

vi.mock("react-map-gl/maplibre", () => {
  interface MockComponentProperties {
    children?: React.ReactNode;
    mapStyle: {
      sources: {
        basemap: {
          tiles: string[];
        };
      };
    };
  }
  interface MockMarkerProperties {
    children?: React.ReactNode;
    latitude: number;
    longitude: number;
  }
  return {
    __esModule: true,
    default: ({ children, mapStyle }: MockComponentProperties) => (
      <div
        data-style-url={mapStyle.sources.basemap.tiles[0]}
        data-testid="maplibre-map"
      >
        {children}
      </div>
    ),
    Marker: ({ children, latitude, longitude }: MockMarkerProperties) => (
      <div
        data-position={`${latitude},${longitude}`}
        data-testid="marker-wrapper"
      >
        {children}
      </div>
    ),
  };
});

vi.mock("maplibre-gl", () => ({
  __esModule: true,
  default: {},
}));

const mockLocations = [
  {
    city: "New York",
    lat: 40.7128,
    lng: -74.006,
    location_id: 1,
    state: "NY",
  },
  {
    city: "Los Angeles",
    lat: 34.0522,
    lng: -118.2437,
    location_id: 2,
    state: "CA",
  },
];

const emptyLocations: typeof mockLocations = [];
const noopMarkerClick = () => {};

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("mapComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue({ resolvedTheme: "light" });
  });

  it("should display a loading message on initial render", () => {
    renderWithQueryClient(
      <MapComponent
        locations={emptyLocations}
        onMarkerClick={noopMarkerClick}
      />,
    );
    expect(screen.getByText("Loading map...")).toBeInTheDocument();
  });

  it('should display "No Map Data Available" when no locations are provided', async () => {
    renderWithQueryClient(
      <MapComponent
        locations={emptyLocations}
        onMarkerClick={noopMarkerClick}
      />,
    );

    const noDataMessage = await screen.findByText(/no map data available/iu);
    expect(noDataMessage).toBeInTheDocument();

    expect(screen.queryByText("Loading map...")).not.toBeInTheDocument();
  });

  it("should render the map and markers when locations are provided", async () => {
    renderWithQueryClient(
      <MapComponent
        locations={mockLocations}
        onMarkerClick={noopMarkerClick}
      />,
    );

    await screen.findByTestId("map-container");

    expect(screen.getByTestId("maplibre-map")).toBeInTheDocument();
    const markers = screen.getAllByLabelText(/open details for/iu);
    expect(markers).toHaveLength(mockLocations.length);
    expect(screen.queryByText("Loading map...")).not.toBeInTheDocument();
  });

  it("should use a dark basemap when dark mode is active", async () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "dark" });

    renderWithQueryClient(
      <MapComponent
        locations={mockLocations}
        onMarkerClick={noopMarkerClick}
      />,
    );

    const map = await screen.findByTestId("maplibre-map");
    expect(map).toHaveAttribute(
      "data-style-url",
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    );
  });

  it("should call onMarkerClick with the correct location_id when a marker is clicked", async () => {
    const onMarkerClick = mockFn();
    renderWithQueryClient(
      <MapComponent locations={mockLocations} onMarkerClick={onMarkerClick} />,
    );

    const markers = await screen.findAllByLabelText(/open details for/iu);

    const firstMarker = markers[0];
    if (!firstMarker) {
      throw new Error("No marker found");
    }
    fireEvent.click(firstMarker);

    expect(onMarkerClick).toHaveBeenCalledTimes(1);
    const firstLocation = mockLocations[0];
    if (!firstLocation) {
      throw new Error("No location found");
    }
    expect(onMarkerClick).toHaveBeenCalledWith(firstLocation.location_id);
  });

  it("should keep the thermal stress legend collapsed by default and toggle open", async () => {
    renderWithQueryClient(
      <MapComponent
        locations={mockLocations}
        onMarkerClick={noopMarkerClick}
      />,
    );

    await screen.findByTestId("map-container");

    const desktopLegendToggle = screen.getByRole("button", {
      name: "Show Wetbulb Index",
    });
    expect(desktopLegendToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("heading", { name: "Wetbulb Index" }),
    ).not.toBeInTheDocument();

    fireEvent.click(desktopLegendToggle);

    expect(desktopLegendToggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getAllByRole("heading", { name: "Wetbulb Index" }).length,
    ).toBeGreaterThan(0);
  });
});
