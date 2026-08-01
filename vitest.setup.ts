import "@testing-library/jest-dom";

import { mockFn } from "@/testing/mock-fn";
import { server } from "@/testing/server";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import type { TemperatureUnit, WetbulbBasis } from "@/lib/constants";
import type { ReactNode } from "react";

vi.mock("@/components/app/unit-provider", () => ({
  UnitProvider: ({ children }: { children: ReactNode }) => children,
  useTemperatureUnit: () => ({
    setUnit: vi.fn<(unit: TemperatureUnit) => void>(),
    unit: "F" as const,
  }),
}));

vi.mock("@/components/app/basis-provider", () => ({
  BasisProvider: ({ children }: { children: ReactNode }) => children,
  useWetbulbBasis: () => ({
    basis: "max" as const,
    setBasis: vi.fn<(basis: WetbulbBasis) => void>(),
  }),
}));

vi.mock("next/font/google", () =>
  Object.fromEntries([
    [
      "Geist",
      () => ({
        variable: "--font-sans",
      }),
    ],
    [
      "Geist_Mono",
      () => ({
        variable: "--font-mono",
      }),
    ],
  ]),
);

globalThis.mockFn = mockFn;

const originalConsoleError = globalThis.console.error;
globalThis.console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Cannot get CSS styles from text's parentNode") ||
      (args[0].includes("of chart should be greater than 0") &&
        args[0].includes("The width(")))
  ) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = globalThis.console.warn;
globalThis.console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Cannot get CSS styles from text's parentNode") ||
      (args[0].includes("of chart should be greater than 0") &&
        args[0].includes("The width(")))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

process.env.NEXT_PUBLIC_E2E_TEST ??= "false";
process.env.E2E_USE_RUNTIME_MOCKS ??= "false";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

if (typeof globalThis.HTMLElement.prototype.hasPointerCapture !== "function") {
  globalThis.HTMLElement.prototype.hasPointerCapture = () => false;
}
if (
  typeof globalThis.HTMLElement.prototype.releasePointerCapture !== "function"
) {
  globalThis.HTMLElement.prototype.releasePointerCapture = () => {};
}
if (typeof globalThis.HTMLElement.prototype.setPointerCapture !== "function") {
  globalThis.HTMLElement.prototype.setPointerCapture = () => {};
}
if (typeof globalThis.HTMLElement.prototype.scrollIntoView !== "function") {
  globalThis.HTMLElement.prototype.scrollIntoView = () => {};
}

vi.spyOn(globalThis.HTMLElement.prototype, "hasPointerCapture").mockReturnValue(
  false,
);
vi.spyOn(
  globalThis.HTMLElement.prototype,
  "releasePointerCapture",
).mockImplementation(() => {});
vi.spyOn(
  globalThis.HTMLElement.prototype,
  "setPointerCapture",
).mockImplementation(() => {});
vi.spyOn(globalThis.HTMLElement.prototype, "scrollIntoView").mockImplementation(
  () => {},
);
