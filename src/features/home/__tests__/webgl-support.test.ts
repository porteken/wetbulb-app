import { afterEach, describe, expect, it, vi } from "vitest";

import { isWebglSupported } from "../lib/webgl-support";

type GetContextResult = ReturnType<HTMLCanvasElement["getContext"]>;

describe("isWebglSupported", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return true and release the probe context when webgl2 is available", () => {
    const loseContext = mockFn();
    const getExtension = mockFn(() => ({ loseContext }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension,
    } as unknown as GetContextResult);

    expect(isWebglSupported()).toBe(true);
    expect(getExtension).toHaveBeenCalledWith("WEBGL_lose_context");
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it("should return false when webgl2 context creation returns null", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    expect(isWebglSupported()).toBe(false);
  });

  it("should return false when webgl2 context creation throws", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => {
        throw new Error("Failed to initialize WebGL");
      },
    );

    expect(isWebglSupported()).toBe(false);
  });
});
