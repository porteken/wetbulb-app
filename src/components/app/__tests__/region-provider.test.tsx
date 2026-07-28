import { ToastProvider } from "@/components/ui/toast";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readCookieRegion,
  RegionProvider,
  useDataRegion,
} from "../region-provider";
import { RegionToggle } from "../region-toggle";

vi.unmock("@/components/app/region-provider");

const { pathnameMock, routerPushMock, routerRefreshMock, setDataRegionMock } =
  vi.hoisted(() => ({
    pathnameMock: vi.fn<() => string>(() => "/"),
    routerPushMock: vi.fn<(_href: string) => void>(),
    routerRefreshMock: vi.fn<() => void>(),
    setDataRegionMock: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  }));

vi.mock("@/lib/actions/actions", () => ({
  setDataRegion: setDataRegionMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
}));

let cookieValue = "";

const setCookie = (value: string) => {
  cookieValue = `data-region=${value}`;
};

const resetCookie = () => {
  cookieValue = "";
  pathnameMock.mockReturnValue("/");
  setDataRegionMock.mockClear();
  routerPushMock.mockClear();
  routerRefreshMock.mockClear();
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => cookieValue,
  });
};

describe("regionProvider", () => {
  beforeEach(resetCookie);

  it("should default to north america when no cookie is set", () => {
    const { result } = renderHook(() => useDataRegion(), {
      wrapper: RegionProvider,
    });

    expect(result.current.region).toBe("na");
  });

  it("should read a persisted europe preference from the cookie on mount", async () => {
    setCookie("eu");

    const { result } = renderHook(() => useDataRegion(), {
      wrapper: RegionProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.region).toBe("eu");
  });

  it("should ignore an invalid cookie value and fall back to north america", async () => {
    setCookie("antarctica");

    const { result } = renderHook(() => useDataRegion(), {
      wrapper: RegionProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.region).toBe("na");
  });

  it("should throw when used outside of a RegionProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useDataRegion())).toThrow(
      "useDataRegion must be used within a RegionProvider",
    );

    consoleError.mockRestore();
  });
});

describe("readCookieRegion", () => {
  beforeEach(resetCookie);

  it("returns the default region when document is unavailable", () => {
    const originalDocument = globalThis.document;
    Reflect.deleteProperty(globalThis, "document");

    try {
      expect(readCookieRegion()).toBe("na");
    } finally {
      globalThis.document = originalDocument;
    }
  });
});

const renderToggle = () =>
  render(
    <ToastProvider>
      <RegionProvider>
        <RegionToggle />
      </RegionProvider>
    </ToastProvider>,
  );

describe("regionToggle", () => {
  beforeEach(resetCookie);

  it("should switch to europe, persist the preference, and refresh the router", () => {
    renderToggle();

    const button = screen.getByRole("button", { name: "Switch to Europe" });
    expect(button).toHaveTextContent("N. America");

    fireEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Switch to North America" }),
    ).toHaveTextContent("Europe");
    expect(setDataRegionMock).toHaveBeenCalledWith("eu");
    expect(routerRefreshMock).toHaveBeenCalled();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("should leave a location page when the region changes", () => {
    pathnameMock.mockReturnValue("/42");

    renderToggle();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Europe" }));

    expect(routerPushMock).toHaveBeenCalledWith("/");
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });
});
