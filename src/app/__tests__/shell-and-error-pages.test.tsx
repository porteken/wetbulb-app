import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { captureExceptionMock, mockAppProviders } = vi.hoisted(() => ({
  captureExceptionMock: mockFn(),
  mockAppProviders: mockFn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-providers">{children}</div>
  )),
}));

vi.mock("@/components/app/providers", () => ({
  AppProviders: mockAppProviders,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...properties
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...properties}>
      {children}
    </a>
  ),
}));

import React from "react";

import LocationError from "../[id]/error";
import AboutError from "../about/error";
import Default from "../default";
import ErrorPage from "../error";
import GlobalErrorPage from "../global-error";
import RootLayout, { metadata } from "../layout";
import Loading from "../loading";
import MapError from "../map/error";
import NotFound from "../not-found";
import RankingsError from "../rankings/error";

describe("app shell and error pages", () => {
  beforeEach(() => {
    captureExceptionMock.mockClear();
  });

  it("renders the default fallback page", () => {
    render(<Default />);

    expect(screen.getByText("Default Page")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is the default fallback page for parallel routes.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the loading state", () => {
    render(<Loading />);

    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the not found page", () => {
    render(<NotFound />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders the root layout metadata and children", () => {
    const layout = RootLayout({
      children: <span>Child content</span>,
    });

    expect(layout.type).toBe("html");
    expect(layout.props.lang).toBe("en");
    expect(layout.props.children.type).toBe("body");
    const bodyChildren = Array.isArray(layout.props.children.props.children)
      ? layout.props.children.props.children
      : [layout.props.children.props.children];
    const appProviders = bodyChildren.find(
      (child: React.ReactNode) =>
        React.isValidElement(child) && child.type === mockAppProviders,
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined;

    expect(appProviders).toBeDefined();
    expect(appProviders?.props.children).toStrictEqual(
      <span>Child content</span>,
    );
    expect(metadata).toStrictEqual({
      description: "Historical wet-bulb temperature data for US cities",
      title: "Historical Wetbulb App",
    });
  });

  it("renders the root error page, reports to Sentry, and retries on click", () => {
    const reset = mockFn();
    const error = new Error("Unexpected failure");

    render(<ErrorPage error={error} reset={reset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(
      screen.getByText("An unexpected error occurred. Please try again."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "porteken@gmail.com" }),
    ).toHaveAttribute("href", "mailto:porteken@gmail.com");
    expect(captureExceptionMock).toHaveBeenCalledWith(error);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders the global error page, reports to Sentry, and retries on click", () => {
    const reset = mockFn();
    const error = new Error("Global failure");
    const globalErrorPage = GlobalErrorPage({ error, reset });

    expect(globalErrorPage.type).toBe("html");
    expect(globalErrorPage.props.lang).toBe("en");
    expect(globalErrorPage.props.children.type).toBe("body");

    render(globalErrorPage.props.children.props.children);

    expect(
      screen.getByText("An unexpected error occurred. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Need help?");
    expect(captureExceptionMock).toHaveBeenCalledWith(error);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders the about page error content without leaking the raw error message", () => {
    const reset = mockFn();
    const error = new Error("About exploded");

    render(<AboutError error={error} reset={reset} />);

    expect(screen.getByText("About Page Error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "An error occurred while loading the about page content.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("About exploded")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to homepage" }),
    ).toHaveAttribute("href", "/");
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
  });

  it("renders the map error fallback content without leaking the raw error message", () => {
    const error = new Error("Map load failed");
    render(<MapError error={error} reset={mockFn()} />);

    expect(screen.getByText("Map Error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "An error occurred while loading the map data or rendering the map.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Map load failed")).not.toBeInTheDocument();
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
  });

  it("renders the rankings error fallback content and reports to Sentry", () => {
    const error = new Error("Rankings query failed");
    render(<RankingsError error={error} reset={mockFn()} />);

    expect(screen.getByText("Rankings Error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Failed to load city rankings. The database may be temporarily unavailable.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to homepage" }),
    ).toHaveAttribute("href", "/");
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
  });

  it("renders the location error fallback content without leaking the raw error message", () => {
    const error = new Error("Location data load failed");
    render(<LocationError error={error} reset={mockFn()} />);

    expect(screen.getByText("Location Data Error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Failed to load the location data. The location may not exist or there was an error retrieving the data.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Location data load failed"),
    ).not.toBeInTheDocument();
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
  });
});
