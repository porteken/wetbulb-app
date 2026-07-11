import { describe, expect, it } from "vitest";

import { createDataRouteErrorResponse } from "../response";

describe("createDataRouteErrorResponse", () => {
  it("uses the provided status code for typed route errors", async () => {
    const response = createDataRouteErrorResponse(
      {
        message: "Teapot meltdown",
        statusCode: 418,
      },
      "Fallback error",
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Teapot meltdown",
    });
    expect(response.status).toBe(418);
  });

  it("uses the error message for standard Error instances", async () => {
    const response = createDataRouteErrorResponse(
      new Error("Unexpected failure"),
      "Fallback error",
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unexpected failure",
    });
    expect(response.status).toBe(500);
  });

  it("falls back to the provided message for unknown errors", async () => {
    const response = createDataRouteErrorResponse("wat", "Fallback error");

    await expect(response.json()).resolves.toStrictEqual({
      error: "Fallback error",
    });
    expect(response.status).toBe(500);
  });
});
