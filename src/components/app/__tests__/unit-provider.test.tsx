import "@testing-library/jest-dom";

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/components/app/unit-provider");

import {
  readCookieUnit,
  UnitProvider,
  useTemperatureUnit,
} from "../unit-provider";
import { UnitToggle } from "../unit-toggle";

const setCookie = (value: string) => {
  document.cookie = `temperature-unit=${value}; path=/`;
};

const clearCookie = () => {
  document.cookie = "temperature-unit=; path=/; max-age=0";
};

describe("unitProvider", () => {
  beforeEach(() => {
    clearCookie();
  });

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

  it("should update state and persist the cookie when setUnit is called", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: UnitProvider,
    });

    act(() => {
      result.current.setUnit("C");
    });

    expect(result.current.unit).toBe("C");
    expect(document.cookie).toContain("temperature-unit=C");
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
  beforeEach(() => {
    clearCookie();
  });

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
  beforeEach(() => {
    clearCookie();
  });

  it("should render the current unit and toggle to the other unit on click", () => {
    render(
      <UnitProvider>
        <UnitToggle />
      </UnitProvider>,
    );

    const button = screen.getByRole("button", { name: "Switch to °C" });
    expect(button).toHaveTextContent("°F");

    fireEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Switch to °F" }),
    ).toHaveTextContent("°C");
    expect(document.cookie).toContain("temperature-unit=C");
  });
});
