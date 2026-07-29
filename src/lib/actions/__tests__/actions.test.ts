import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  setForecastPreferences,
  setGraphMeasure,
  setGraphSeason,
  setRankingsWetbulbLevel,
  setRankingsSeason,
  setRankingsState,
  setRankingsYear,
  setTemperatureUnit,
  setWetbulbBasis,
} from "../actions";

import type { GraphSeason } from "@/lib/constants";

vi.mock("next/headers", () => ({
  cookies: mockFn().mockResolvedValue({
    set: mockFn(),
  }),
}));

describe("setGraphMeasure", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets the graph measure cookie with correct parameters", async () => {
    const measure = "max";

    await setGraphMeasure(measure);

    expect(mockSet).toHaveBeenCalledWith(
      "graph-measure",
      measure,
      expect.objectContaining({
        expires: expect.any(Date),
        httpOnly: true,
        path: "/",
        secure: false,
      }),
    );
  });

  it("ignores an invalid graph measure without setting a cookie", async () => {
    await setGraphMeasure("temperature");

    expect(mockSet).not.toHaveBeenCalled();
  });

  it("sets cookie with expiration date approximately 1 year from now", async () => {
    const measure = "avg";
    const beforeCall = Date.now();

    await setGraphMeasure(measure);

    expect(mockSet).toHaveBeenCalledWith(
      "graph-measure",
      measure,
      expect.objectContaining({
        expires: expect.any(Date),
        httpOnly: true,
        path: "/",
      }),
    );

    const call = mockSet.mock.calls[0];
    if (!call) {
      throw new Error("No call to mockSet found");
    }
    const cookieOptions = call[2];
    const expirationDate = cookieOptions.expires;
    const afterCall = Date.now();

    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const expectedExpiration = beforeCall + oneYearMs;
    const actualExpiration = expirationDate.getTime();

    expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1000);
    expect(actualExpiration).toBeLessThanOrEqual(afterCall + oneYearMs + 1000);
  });
});

describe("setGraphSeason", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets the graph season cookie with correct parameters", async () => {
    await setGraphSeason("Winter");

    expect(mockSet).toHaveBeenCalledWith(
      "graph-season",
      "Winter",
      expect.objectContaining({
        expires: expect.any(Date),
        httpOnly: true,
        path: "/",
        secure: false,
      }),
    );
  });

  it("ignores an invalid graph season without setting a cookie", async () => {
    await setGraphSeason("Not A Season");

    expect(mockSet).not.toHaveBeenCalled();
  });
});

describe("setTemperatureUnit", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets a client-readable temperature-unit cookie", async () => {
    await setTemperatureUnit("C");

    expect(mockSet).toHaveBeenCalledWith(
      "temperature-unit",
      "C",
      expect.objectContaining({
        expires: expect.any(Date),
        httpOnly: false,
        path: "/",
        secure: false,
      }),
    );
  });

  it("ignores an invalid unit without setting a cookie", async () => {
    await setTemperatureUnit("kelvin");

    expect(mockSet).not.toHaveBeenCalled();
  });
});

describe("setWetbulbBasis", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets a client-readable wetbulb-basis cookie and revalidates rankings", async () => {
    const { revalidatePath } = await import("next/cache");

    await setWetbulbBasis("avg");

    expect(mockSet).toHaveBeenCalledWith(
      "wetbulb-basis",
      "avg",
      expect.objectContaining({
        expires: expect.any(Date),
        httpOnly: false,
        path: "/",
        secure: false,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/rankings");
  });

  it("ignores an invalid basis without setting a cookie", async () => {
    const { revalidatePath } = await import("next/cache");

    await setWetbulbBasis("median");

    expect(mockSet).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setForecastPreferences", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets both forecast cookies with correct values", async () => {
    await setForecastPreferences(true, 20);

    expect(mockSet).toHaveBeenNthCalledWith(
      1,
      "forecast-enabled",
      "true",
      expect.objectContaining({
        expires: expect.any(Date),
        httpOnly: true,
        path: "/",
      }),
    );
    expect(mockSet).toHaveBeenNthCalledWith(
      2,
      "forecast-years-ahead",
      "20",
      expect.objectContaining({
        expires: expect.any(Date),
        httpOnly: true,
        path: "/",
      }),
    );
  });

  it("uses a 1-year expiration window", async () => {
    const beforeCall = Date.now();

    await setForecastPreferences(false, 15);

    const call0 = mockSet.mock.calls[0];
    const call1 = mockSet.mock.calls[1];
    if (!call0 || !call1) {
      throw new Error("Expected two calls to mockSet");
    }
    const enabledCookieOptions = call0[2];
    const yearsCookieOptions = call1[2];
    const afterCall = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    expect(enabledCookieOptions.expires.getTime()).toBeGreaterThanOrEqual(
      beforeCall + oneYearMs - 1000,
    );
    expect(enabledCookieOptions.expires.getTime()).toBeLessThanOrEqual(
      afterCall + oneYearMs + 1000,
    );
    expect(yearsCookieOptions.expires.getTime()).toBeGreaterThanOrEqual(
      beforeCall + oneYearMs - 1000,
    );
    expect(yearsCookieOptions.expires.getTime()).toBeLessThanOrEqual(
      afterCall + oneYearMs + 1000,
    );
  });

  it("ignores forecast years ahead below the minimum without setting a cookie", async () => {
    await setForecastPreferences(true, 1);

    expect(mockSet).not.toHaveBeenCalled();
  });

  it("ignores forecast years ahead above the maximum without setting a cookie", async () => {
    await setForecastPreferences(true, 1000);

    expect(mockSet).not.toHaveBeenCalled();
  });

  it("ignores a non-integer forecast years ahead value without setting a cookie", async () => {
    await setForecastPreferences(true, 10.5);

    expect(mockSet).not.toHaveBeenCalled();
  });
});

vi.mock("next/headers", () => ({
  cookies: mockFn().mockResolvedValue({
    set: mockFn(),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockFn(),
}));

describe("setRankingsYear", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets the rankings year cookie with correct parameters", async () => {
    await setRankingsYear(2020);

    expect(mockSet).toHaveBeenCalledWith(
      "rankings-year",
      "2020",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false,
      }),
    );
  });

  it("calls revalidatePath with /rankings", async () => {
    const { revalidatePath } = await import("next/cache");

    await setRankingsYear(2020);

    expect(revalidatePath).toHaveBeenCalledWith("/rankings");
  });

  it("persists multiple states", async () => {
    await setRankingsState("TX,AZ");

    expect(mockSet).toHaveBeenCalledWith(
      "rankings-state",
      "TX,AZ",
      expect.any(Object),
    );
  });

  it("ignores a year outside the configured range without setting a cookie", async () => {
    const { revalidatePath } = await import("next/cache");

    await setRankingsYear(1999);

    expect(mockSet).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setRankingsState", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets the rankings state cookie with correct parameters", async () => {
    await setRankingsState("TX");

    expect(mockSet).toHaveBeenCalledWith(
      "rankings-state",
      "TX",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false,
      }),
    );
  });

  it("calls revalidatePath with /rankings", async () => {
    const { revalidatePath } = await import("next/cache");

    await setRankingsState("NY");

    expect(revalidatePath).toHaveBeenCalledWith("/rankings");
  });

  it("persists multiple wetbulb levels", async () => {
    await setRankingsWetbulbLevel("Moderate Risk,High Risk");

    expect(mockSet).toHaveBeenCalledWith(
      "rankings-wetbulb-level",
      "Moderate Risk,High Risk",
      expect.any(Object),
    );
  });

  it("ignores a state value with disallowed characters without setting a cookie", async () => {
    const { revalidatePath } = await import("next/cache");

    await setRankingsState("TX; DROP TABLE locations;");

    expect(mockSet).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setRankingsSeason", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets the rankings season cookie with correct parameters", async () => {
    await setRankingsSeason("Winter");

    expect(mockSet).toHaveBeenCalledWith(
      "rankings-season",
      "Winter",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false,
      }),
    );
  });

  it("calls revalidatePath with /rankings", async () => {
    const { revalidatePath } = await import("next/cache");

    await setRankingsSeason("Spring");

    expect(revalidatePath).toHaveBeenCalledWith("/rankings");
  });

  it("ignores an invalid season without setting a cookie", async () => {
    const { revalidatePath } = await import("next/cache");

    await setRankingsSeason("Not A Season" as GraphSeason);

    expect(mockSet).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setRankingsWetbulbLevel", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    const cookiesResult = await cookies();
    mockSet = vi.mocked(cookiesResult.set);
  });

  it("sets the rankings wetbulb level cookie with correct parameters", async () => {
    await setRankingsWetbulbLevel("Moderate Risk");

    expect(mockSet).toHaveBeenCalledWith(
      "rankings-wetbulb-level",
      "Moderate Risk",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false,
      }),
    );
  });

  it("calls revalidatePath with /rankings", async () => {
    const { revalidatePath } = await import("next/cache");

    await setRankingsWetbulbLevel("High Risk");

    expect(revalidatePath).toHaveBeenCalledWith("/rankings");
  });

  it("allows clearing the filter with an empty string", async () => {
    await setRankingsWetbulbLevel("");

    expect(mockSet).toHaveBeenCalledWith(
      "rankings-wetbulb-level",
      "",
      expect.any(Object),
    );
  });

  it("ignores an unrecognized wetbulb level without setting a cookie", async () => {
    const { revalidatePath } = await import("next/cache");

    await setRankingsWetbulbLevel("Moderate");

    expect(mockSet).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

const setupSecureCookieTest = async () => {
  vi.doMock("next/headers", () => ({
    cookies: mockFn().mockResolvedValue({ set: mockFn() }),
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: mockFn() }));

  const actionsModule = await import("../actions");
  const { cookies } = await import("next/headers");
  const cookiesResult = await cookies();
  const mockSet = vi.mocked(cookiesResult.set);

  return { actionsModule, mockSet };
};

describe("cookie security", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("sets secure cookies in production outside of e2e test runs", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST", "false");

    const { actionsModule, mockSet } = await setupSecureCookieTest();

    await actionsModule.setGraphMeasure("avg");

    expect(mockSet).toHaveBeenCalledWith(
      "graph-measure",
      "avg",
      expect.objectContaining({ secure: true }),
    );
  });

  it("does not set secure cookies during production e2e test runs", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST", "true");

    const { actionsModule, mockSet } = await setupSecureCookieTest();

    await actionsModule.setGraphMeasure("avg");

    expect(mockSet).toHaveBeenCalledWith(
      "graph-measure",
      "avg",
      expect.objectContaining({ secure: false }),
    );
  });
});
