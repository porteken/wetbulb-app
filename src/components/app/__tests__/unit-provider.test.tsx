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
  readCookieUnit,
  UnitProvider,
  useTemperatureUnit,
} from "../unit-provider";
import { UnitToggle } from "../unit-toggle";

vi.unmock("@/components/app/unit-provider");

const { setTemperatureUnitMock } = vi.hoisted(() => ({
  setTemperatureUnitMock: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

vi.mock("@/lib/actions/actions", () => ({
  setTemperatureUnit: setTemperatureUnitMock,
}));

let cookieValue = "";

const setCookie = (value: string) => {
  cookieValue = `temperature-unit=${value}`;
};

const resetCookie = () => {
  cookieValue = "";
  setTemperatureUnitMock.mockClear();
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => cookieValue,
  });
};

describe("unitProvider", () => {
  beforeEach(resetCookie);

  it("should default to Fahrenheit when no cookie is set", async () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: UnitProvider,
    });

    expect(result.current.unit).toBe("F");
  });

  it("should read a persisted Celsius preference from the cookie on mount", async () => {
    setCookie("C");

    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: UnitProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.unit).toBe("C");
  });

  it("should ignore an invalid cookie value and fall back to Fahrenheit", async () => {
    setCookie("kelvin");

    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: UnitProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.unit).toBe("F");
  });

  it("should update state when setUnit is called", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: UnitProvider,
    });

    act(() => {
      result.current.setUnit("C");
    });

    expect(result.current.unit).toBe("C");
  });

  it("should throw when used outside of a UnitProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useTemperatureUnit())).toThrow(
      "useTemperatureUnit must be used within a UnitProvider",
    );

    consoleError.mockRestore();
  });
});

describe("readCookieUnit", () => {
  beforeEach(resetCookie);

  it("returns the default unit when document is unavailable", () => {
    const originalDocument = globalThis.document;
    Reflect.deleteProperty(globalThis, "document");

    try {
      expect(readCookieUnit()).toBe("F");
    } finally {
      globalThis.document = originalDocument;
    }
  });
});

describe("unitToggle", () => {
  beforeEach(resetCookie);

  it("should toggle the unit and persist the preference on click", () => {
    render(
      <ToastProvider>
        <UnitProvider>
          <UnitToggle />
        </UnitProvider>
      </ToastProvider>,
    );

    const button = screen.getByRole("button", { name: "Switch to °C" });
    expect(button).toHaveTextContent("°F");

    fireEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Switch to °F" }),
    ).toHaveTextContent("°C");
    expect(setTemperatureUnitMock).toHaveBeenCalledWith("C");
  });
});
