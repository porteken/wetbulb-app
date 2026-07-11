import { beforeEach, describe, expect, it } from "vitest";

import { reloadPage } from "../reload";

describe("reload Utility", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "location", {
      value: {
        reload: mockFn(),
      },
      writable: true,
    });
  });

  it("should call globalThis.location.reload", () => {
    reloadPage();

    expect(globalThis.location.reload).toHaveBeenCalledOnce();
  });
});
