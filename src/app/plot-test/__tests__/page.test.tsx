import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function PlotTestClientStub() {
  return null;
}

vi.mock("../plot-test-client", () => ({
  default: PlotTestClientStub,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn<() => never>(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("plot-test page", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the client component outside of production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { default: Page } = await import("../page");

    expect(Page().type).toBe(PlotTestClientStub);
  });

  it("renders the client component during production e2e test runs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST", "true");

    const { default: Page } = await import("../page");

    expect(Page().type).toBe(PlotTestClientStub);
  });

  it("calls notFound in a real production deployment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST", "false");

    const { default: Page } = await import("../page");
    const { notFound } = await import("next/navigation");

    expect(() => Page()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
