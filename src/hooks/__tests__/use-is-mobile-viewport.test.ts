import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIsMobileViewport } from "../use-is-mobile-viewport";

import type { Mock } from "vitest";

describe("useIsMobileViewport", () => {
  let mockMatchMedia: Mock<(query: string) => MediaQueryList>;
  let listeners: ((e: { matches: boolean }) => void)[];

  beforeEach(() => {
    listeners = [];
    vi.clearAllMocks();

    mockMatchMedia = vi
      .fn<(query: string) => MediaQueryList>()
      .mockImplementation(
        (query: string) =>
          ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn<() => void>(),
            removeListener: vi.fn<() => void>(),
            addEventListener: vi
              .fn<
                (
                  event: string,
                  callback: (e: { matches: boolean }) => void,
                ) => void
              >()
              .mockImplementation((_event, callback) => {
                listeners.push(callback);
              }),
            removeEventListener: vi
              .fn<
                (
                  event: string,
                  callback: (e: { matches: boolean }) => void,
                ) => void
              >()
              .mockImplementation((_event, callback) => {
                listeners = listeners.filter((l) => l !== callback);
              }),
            dispatchEvent: vi.fn<() => boolean>(),
          }) as unknown as MediaQueryList,
      );

    globalThis.matchMedia = mockMatchMedia;
  });

  it("returns false if matchMedia is not supported", () => {
    delete (globalThis as any).matchMedia;

    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(false);
  });

  it("returns initial matches state (false)", () => {
    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(false);
    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 639px)");
  });

  it("returns initial matches state (true)", () => {
    mockMatchMedia.mockImplementation(
      (query: string) =>
        ({
          matches: true,
          media: query,
          addEventListener: vi.fn<() => void>(),
          removeEventListener: vi.fn<() => void>(),
        }) as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(true);
  });

  it("updates state when media query changes", () => {
    let currentMatches = false;

    mockMatchMedia.mockImplementation(
      (query: string) =>
        ({
          get matches() {
            return currentMatches;
          },
          media: query,
          addEventListener: vi
            .fn<
              (
                event: string,
                callback: (e: { matches: boolean }) => void,
              ) => void
            >()
            .mockImplementation((_event, callback) => {
              listeners.push(callback);
            }),
          removeEventListener: vi.fn<() => void>(),
        }) as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => useIsMobileViewport());
    expect(result.current).toBe(false);

    act(() => {
      currentMatches = true;
      for (const listener of listeners) {
        listener({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListener =
      vi.fn<
        (event: string, callback: (e: { matches: boolean }) => void) => void
      >();
    mockMatchMedia.mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: vi.fn<() => void>(),
          removeEventListener,
        }) as unknown as MediaQueryList,
    );

    const { unmount } = renderHook(() => useIsMobileViewport());
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("supports custom media queries", () => {
    const customQuery = "(max-width: 1024px)";
    renderHook(() => useIsMobileViewport(customQuery));
    expect(mockMatchMedia).toHaveBeenCalledWith(customQuery);
  });
});
