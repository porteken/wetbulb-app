import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MapComponent } from "../components/map-component";

const { mockIsWebglSupported, mockUseTheme } = vi.hoisted(() => ({
  mockIsWebglSupported: mockFn(() => true),
  mockUseTheme: mockFn(() => ({ resolvedTheme: "light" })),
}));

vi.mock("next-themes", () =>
  Object.fromEntries([["useTheme", () => mockUseTheme()]]),
);

vi.mock("../lib/webgl-support", () => ({
  isWebglSupported: () => mockIsWebglSupported(),
}));

vi.mock("react-map-gl/maplibre", () => {
  interface MockComponentProperties {
    children?: React.ReactNode;
    initialViewState: {
      bounds: readonly [readonly [number, number], readonly [number, number]];
    };
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
    default: ({
      children,
      initialViewState,
      mapStyle,
    }: MockComponentProperties) => (
      <div
        data-initial-bounds={JSON.stringify(initialViewState.bounds)}
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
    mockIsWebglSupported.mockReturnValue(true);
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
    expect(screen.getByTestId("maplibre-map")).toHaveAttribute(
      "data-initial-bounds",
      JSON.stringify([
        [-125, 24.4],
        [-66.9, 53.55],
      ]),
    );
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

  it("should show the WebGL fallback with a city list when WebGL is unsupported", async () => {
    mockIsWebglSupported.mockReturnValue(false);

    renderWithQueryClient(
      <MapComponent
        locations={mockLocations}
        onMarkerClick={noopMarkerClick}
      />,
    );

    const fallbackHeading = await screen.findByText(
      /interactive map unavailable/iu,
    );
    expect(fallbackHeading).toBeInTheDocument();

    expect(screen.queryByTestId("maplibre-map")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New York, NY" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Los Angeles, CA" }),
    ).toBeInTheDocument();
  });

  it("should call onMarkerClick from the WebGL fallback city list", async () => {
    mockIsWebglSupported.mockReturnValue(false);
    const onMarkerClick = mockFn();

    renderWithQueryClient(
      <MapComponent locations={mockLocations} onMarkerClick={onMarkerClick} />,
    );

    const cityButton = await screen.findByRole("button", {
      name: "New York, NY",
    });
    fireEvent.click(cityButton);

    expect(onMarkerClick).toHaveBeenCalledTimes(1);
    expect(onMarkerClick).toHaveBeenCalledWith(1);
  });

  it('should still show "No Map Data Available" when WebGL is unsupported and no locations exist', async () => {
    mockIsWebglSupported.mockReturnValue(false);

    renderWithQueryClient(
      <MapComponent
        locations={emptyLocations}
        onMarkerClick={noopMarkerClick}
      />,
    );

    const noDataMessage = await screen.findByText(/no map data available/iu);
    expect(noDataMessage).toBeInTheDocument();
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
