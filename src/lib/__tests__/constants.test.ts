import { describe, expect, it } from "vitest";

import { DEFAULT_WETBULB_BASIS, normalizeWetbulbBasis } from "../constants";

describe("normalizeWetbulbBasis", () => {
  it.each(["max", "avg"] as const)(
    "passes through a valid basis %s",
    (basis) => {
      expect(normalizeWetbulbBasis(basis)).toBe(basis);
    },
  );

  it("falls back to the default basis for an unrecognized value", () => {
    expect(normalizeWetbulbBasis("median")).toBe(DEFAULT_WETBULB_BASIS);
  });

  it("falls back to the default basis when undefined", () => {
    const [value] = [] as string[];
    expect(normalizeWetbulbBasis(value)).toBe(DEFAULT_WETBULB_BASIS);
  });
});
