import { describe, expect, it } from "vitest";

import { groupLocationsByState } from "../location-options";

const location = (location_id: number, city: string, state: string) => ({
  city,
  location_id,
  state,
});

describe("groupLocationsByState", () => {
  it("should group locations into one section per state", () => {
    expect(
      groupLocationsByState([
        location(1, "Austin", "TX"),
        location(2, "Dallas", "TX"),
        location(3, "Miami", "FL"),
      ]),
    ).toEqual([
      {
        items: [{ key: 3, title: "Miami" }],
        title: "FL",
      },
      {
        items: [
          { key: 1, title: "Austin" },
          { key: 2, title: "Dallas" },
        ],
        title: "TX",
      },
    ]);
  });

  it("should sort states alphabetically and cities within each state", () => {
    const sections = groupLocationsByState([
      location(1, "Seattle", "WA"),
      location(2, "Tucson", "AZ"),
      location(3, "Phoenix", "AZ"),
    ]);

    expect(sections.map((section) => section.title)).toEqual(["AZ", "WA"]);
    expect(sections[0]?.items.map((item) => item.title)).toEqual([
      "Phoenix",
      "Tucson",
    ]);
  });

  it("should return an empty array for no locations", () => {
    expect(groupLocationsByState([])).toEqual([]);
  });
});
