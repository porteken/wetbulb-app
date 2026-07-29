import {
  GRAPH_MEASURE_COOKIE_NAME,
  GRAPH_SEASON_COOKIE_NAME,
  REFERENCE_YEAR_COOKIE_NAME,
} from "@/lib/constants";
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";

vi.mock("next/headers", () => ({
  cookies: mockFn().mockResolvedValue({
    set: mockFn(),
  }),
}));

describe("pOST /api/preferences/graph", () => {
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const cookieStore = await cookies();
    mockSet = vi.mocked(cookieStore.set);
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: "invalid-json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON payload");
  });

  it("returns 400 for null payload", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: "null",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON payload");
  });

  it("sets graph measure cookie when provided", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ graphMeasure: "avg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      GRAPH_MEASURE_COOKIE_NAME,
      "avg",
      expect.objectContaining({ secure: false }),
    );
  });

  it("sets secure cookies in production outside of e2e test runs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST", "false");

    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ graphMeasure: "avg" }),
    });

    await POST(request);

    expect(mockSet).toHaveBeenCalledWith(
      GRAPH_MEASURE_COOKIE_NAME,
      "avg",
      expect.objectContaining({ secure: true }),
    );

    vi.unstubAllEnvs();
  });

  it("does not set secure cookies during production e2e test runs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST", "true");

    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ graphMeasure: "avg" }),
    });

    await POST(request);

    expect(mockSet).toHaveBeenCalledWith(
      GRAPH_MEASURE_COOKIE_NAME,
      "avg",
      expect.objectContaining({ secure: false }),
    );

    vi.unstubAllEnvs();
  });

  it("returns 400 for invalid graph measure", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ graphMeasure: "invalid" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid graph measure");
  });

  it("sets graph season cookie when provided", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ graphSeason: "Summer" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      GRAPH_SEASON_COOKIE_NAME,
      "Summer",
      expect.any(Object),
    );
  });

  it("returns 400 for invalid graph season", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ graphSeason: "InvalidSeason" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid graph season");
  });

  it("sets reference year cookie when provided", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ referenceYear: "2020" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      REFERENCE_YEAR_COOKIE_NAME,
      "2020",
      expect.any(Object),
    );
  });

  it("returns 400 for invalid reference year", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ referenceYear: "not-a-year" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid reference year");
  });

  it("returns 400 when reference year is the latest configured year", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({ referenceYear: "2026" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid reference year");
  });

  it("can set multiple preferences at once", async () => {
    const request = new Request("http://localhost/api/preferences/graph", {
      method: "POST",
      body: JSON.stringify({
        graphMeasure: "max",
        graphSeason: "Winter",
        referenceYear: "2020",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(3);
  });
});
