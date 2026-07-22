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
  BasisProvider,
  readCookieBasis,
  useWetbulbBasis,
} from "../basis-provider";
import { BasisToggle } from "../basis-toggle";

vi.unmock("@/components/app/basis-provider");

const { routerRefreshMock, setWetbulbBasisMock } = vi.hoisted(() => ({
  routerRefreshMock: vi.fn<() => void>(),
  setWetbulbBasisMock: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

vi.mock("@/lib/actions/actions", () => ({
  setWetbulbBasis: setWetbulbBasisMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
  }),
}));

let cookieValue = "";

const setCookie = (value: string) => {
  cookieValue = `wetbulb-basis=${value}`;
};

const resetCookie = () => {
  cookieValue = "";
  setWetbulbBasisMock.mockClear();
  routerRefreshMock.mockClear();
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => cookieValue,
  });
};

describe("basisProvider", () => {
  beforeEach(resetCookie);

  it("should default to max when no cookie is set", () => {
    const { result } = renderHook(() => useWetbulbBasis(), {
      wrapper: BasisProvider,
    });

    expect(result.current.basis).toBe("max");
  });

  it("should read a persisted avg preference from the cookie on mount", async () => {
    setCookie("avg");

    const { result } = renderHook(() => useWetbulbBasis(), {
      wrapper: BasisProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.basis).toBe("avg");
  });

  it("should ignore an invalid cookie value and fall back to max", async () => {
    setCookie("bogus");

    const { result } = renderHook(() => useWetbulbBasis(), {
      wrapper: BasisProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.basis).toBe("max");
  });

  it("should update state when setBasis is called", () => {
    const { result } = renderHook(() => useWetbulbBasis(), {
      wrapper: BasisProvider,
    });

    act(() => {
      result.current.setBasis("avg");
    });

    expect(result.current.basis).toBe("avg");
  });

  it("should throw when used outside of a BasisProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useWetbulbBasis())).toThrow(
      "useWetbulbBasis must be used within a BasisProvider",
    );

    consoleError.mockRestore();
  });
});

describe("readCookieBasis", () => {
  beforeEach(resetCookie);

  it("returns the default basis when document is unavailable", () => {
    const originalDocument = globalThis.document;
    Reflect.deleteProperty(globalThis, "document");

    try {
      expect(readCookieBasis()).toBe("max");
    } finally {
      globalThis.document = originalDocument;
    }
  });
});

describe("basisToggle", () => {
  beforeEach(resetCookie);

  it("should toggle the basis, persist the preference, and refresh the router on click", () => {
    render(
      <ToastProvider>
        <BasisProvider>
          <BasisToggle />
        </BasisProvider>
      </ToastProvider>,
    );

    const button = screen.getByRole("button", {
      name: "Switch to daily average wetbulb",
    });
    expect(button).toHaveTextContent("Max");

    fireEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Switch to daily maximum wetbulb" }),
    ).toHaveTextContent("Avg");
    expect(setWetbulbBasisMock).toHaveBeenCalledWith("avg");
    expect(routerRefreshMock).toHaveBeenCalled();
  });
});
