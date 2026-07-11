import "@testing-library/jest-dom";

import { mockFn } from "@/testing/mock-fn";
import { server } from "@/testing/server";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

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

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
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

const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
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

if (typeof globalThis !== "undefined" && globalThis.HTMLElement) {
  if (!globalThis.HTMLElement.prototype.hasPointerCapture) {
    globalThis.HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (!globalThis.HTMLElement.prototype.releasePointerCapture) {
    globalThis.HTMLElement.prototype.releasePointerCapture = () => {};
  }
  if (!globalThis.HTMLElement.prototype.setPointerCapture) {
    globalThis.HTMLElement.prototype.setPointerCapture = () => {};
  }
  if (!globalThis.HTMLElement.prototype.scrollIntoView) {
    globalThis.HTMLElement.prototype.scrollIntoView = () => {};
  }

  vi.spyOn(
    globalThis.HTMLElement.prototype,
    "hasPointerCapture",
  ).mockReturnValue(false);
  vi.spyOn(
    globalThis.HTMLElement.prototype,
    "releasePointerCapture",
  ).mockImplementation(() => {});
  vi.spyOn(
    globalThis.HTMLElement.prototype,
    "setPointerCapture",
  ).mockImplementation(() => {});
  vi.spyOn(
    globalThis.HTMLElement.prototype,
    "scrollIntoView",
  ).mockImplementation(() => {});
}
