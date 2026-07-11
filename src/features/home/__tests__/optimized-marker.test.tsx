import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OptimizedMarker } from "../components/optimized-marker";

const MockMarkerComponent = mockFn(
  ({
    anchor,
    children,
    latitude,
    longitude,
  }: {
    anchor?: string;
    children?: React.ReactNode;
    latitude: number;
    longitude: number;
  }) => (
    <div
      data-anchor={anchor}
      data-position={JSON.stringify([latitude, longitude])}
      data-testid="marker"
    >
      {children}
    </div>
  ),
);

vi.mock("react-map-gl/maplibre", () => ({
  Marker: (properties: unknown) => MockMarkerComponent(properties),
}));

const mockPosition: [number, number] = [40.7128, -74.006];

describe("optimizedMarker", () => {
  const mockProperties: React.ComponentProps<typeof OptimizedMarker> = {
    city: "New York",
    latitude: mockPosition[0],
    longitude: mockPosition[1],
    locationId: 123,
    onClick: mockFn(),
    onPrefetch: mockFn(),
    state: "NY",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders marker component with correct props", () => {
    render(<OptimizedMarker {...mockProperties} />);

    const marker = screen.getByTestId("marker");
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute("data-anchor", "bottom");
    expect(marker).toHaveAttribute(
      "data-position",
      JSON.stringify(mockPosition),
    );
    expect(
      screen.getByRole("button", {
        name: "Open details for New York, NY",
      }),
    ).toHaveAttribute("data-map-marker", "true");
  });

  it("uses a subtler marker fill and glow", () => {
    render(<OptimizedMarker {...mockProperties} />);

    const markerButton = screen.getByRole("button", {
      name: "Open details for New York, NY",
    });
    const markerSvg = markerButton.querySelector("svg");
    const markerPath = markerSvg?.querySelector("path");

    expect(markerSvg).toHaveClass(
      "drop-shadow-[0_4px_10px_rgba(29,78,216,0.18)]",
    );
    expect(markerPath).toHaveAttribute("fill", "#1D4ED8");
    expect(markerPath).toHaveAttribute("fill-opacity", "0.9");
  });

  it("prefetches data when the marker receives focus", async () => {
    const user = userEvent.setup();
    render(<OptimizedMarker {...mockProperties} />);

    const markerButton = screen.getByRole("button", {
      name: "Open details for New York, NY",
    });
    await user.tab();

    expect(markerButton).toHaveFocus();
    expect(mockProperties.onPrefetch).toHaveBeenCalledWith(
      mockProperties.locationId,
    );
  });

  it("calls onClick with locationId when marker is clicked", async () => {
    const user = userEvent.setup();
    render(<OptimizedMarker {...mockProperties} />);

    const markerButton = screen.getByRole("button", {
      name: "Open details for New York, NY",
    });
    await user.click(markerButton);

    expect(mockProperties.onClick).toHaveBeenCalledWith(
      mockProperties.locationId,
    );
  });

  it("prefetches data on mouse enter", async () => {
    const user = userEvent.setup();
    render(<OptimizedMarker {...mockProperties} />);

    const markerButton = screen.getByRole("button", {
      name: "Open details for New York, NY",
    });
    await user.hover(markerButton);

    expect(mockProperties.onPrefetch).toHaveBeenCalledWith(
      mockProperties.locationId,
    );
  });

  it("handles multiple hover events correctly", async () => {
    const user = userEvent.setup();
    render(<OptimizedMarker {...mockProperties} />);

    const markerButton = screen.getByRole("button", {
      name: "Open details for New York, NY",
    });

    await user.hover(markerButton);
    await user.unhover(markerButton);
    await user.hover(markerButton);
    await user.unhover(markerButton);
    await user.hover(markerButton);

    expect(mockProperties.onPrefetch).toHaveBeenCalledTimes(3);
    expect(mockProperties.onPrefetch).toHaveBeenCalledWith(
      mockProperties.locationId,
    );
  });

  it("does not require a prefetch callback", async () => {
    const user = userEvent.setup();

    render(<OptimizedMarker {...mockProperties} onPrefetch={undefined} />);

    const markerButton = screen.getByRole("button", {
      name: "Open details for New York, NY",
    });
    await user.hover(markerButton);

    expect(markerButton).toBeInTheDocument();
  });

  it("creates new component instance when the prefetch callback changes", () => {
    const { rerender } = render(<OptimizedMarker {...mockProperties} />);

    expect(MockMarkerComponent).toHaveBeenCalledTimes(1);

    rerender(<OptimizedMarker {...mockProperties} onPrefetch={mockFn()} />);

    expect(MockMarkerComponent).toHaveBeenCalledTimes(2);
  });

  it("creates new component instance when locationId changes", () => {
    const { rerender } = render(<OptimizedMarker {...mockProperties} />);

    expect(MockMarkerComponent).toHaveBeenCalledTimes(1);

    rerender(<OptimizedMarker {...mockProperties} locationId={456} />);

    expect(MockMarkerComponent).toHaveBeenCalledTimes(2);
  });

  it("memoizes component correctly", () => {
    const { rerender } = render(<OptimizedMarker {...mockProperties} />);

    expect(MockMarkerComponent).toHaveBeenCalledTimes(1);

    rerender(<OptimizedMarker {...mockProperties} />);

    expect(MockMarkerComponent).toHaveBeenCalledTimes(1);
  });

  it("re-renders when props change", () => {
    const { rerender } = render(<OptimizedMarker {...mockProperties} />);

    expect(MockMarkerComponent).toHaveBeenCalledTimes(1);

    rerender(<OptimizedMarker {...mockProperties} locationId={456} />);

    expect(MockMarkerComponent).toHaveBeenCalledTimes(2);
  });

  it("passes all event handlers to marker component", () => {
    render(<OptimizedMarker {...mockProperties} />);

    expect(MockMarkerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: "bottom",
        latitude: mockProperties.latitude,
        longitude: mockProperties.longitude,
      }),
    );
  });

  it("handles onClick prop changes", async () => {
    const user = userEvent.setup();
    const newOnClick = mockFn();

    const { rerender } = render(<OptimizedMarker {...mockProperties} />);

    const markerButton = screen.getByRole("button", {
      name: "Open details for New York, NY",
    });
    await user.click(markerButton);

    expect(mockProperties.onClick).toHaveBeenCalledWith(
      mockProperties.locationId,
    );
    expect(newOnClick).not.toHaveBeenCalled();

    rerender(<OptimizedMarker {...mockProperties} onClick={newOnClick} />);

    await user.click(
      screen.getByRole("button", {
        name: "Open details for New York, NY",
      }),
    );

    expect(newOnClick).toHaveBeenCalledWith(mockProperties.locationId);
  });

  it("has correct display name", () => {
    expect(OptimizedMarker.displayName).toBe("OptimizedMarker");
  });
});
