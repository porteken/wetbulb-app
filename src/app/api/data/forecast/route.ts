import { FetchForecastData } from "@/lib/api/fetch-server";
import {
  DEFAULT_GRAPH_SEASON,
  DEFAULT_FORECAST_SCENARIO,
  isForecastScenario,
  normalizeGraphSeason,
  normalizeWetbulbBasis,
} from "@/lib/constants";
import { validateLocationId } from "@/lib/utils/validation";
import { NextResponse } from "next/server";

import {
  createCachedDataRouteResponse,
  createDataRouteErrorResponse,
} from "../response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locationId = Number(url.searchParams.get("locationId"));
  const season = normalizeGraphSeason(
    url.searchParams.get("season") ?? DEFAULT_GRAPH_SEASON,
  );
  const option = url.searchParams.get("option") ?? "avg";
  const basis = normalizeWetbulbBasis(
    url.searchParams.get("basis") ?? undefined,
  );
  const yearsAhead = Number(url.searchParams.get("yearsAhead"));
  const scenarioValue =
    url.searchParams.get("scenario") ?? DEFAULT_FORECAST_SCENARIO;

  if (!validateLocationId(locationId)) {
    return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
  }

  if (!Number.isFinite(yearsAhead) || yearsAhead < 0) {
    return NextResponse.json(
      { error: "Invalid yearsAhead value" },
      { status: 400 },
    );
  }

  if (!isForecastScenario(scenarioValue)) {
    return NextResponse.json(
      { error: "Invalid forecast scenario" },
      { status: 400 },
    );
  }

  try {
    const data = await FetchForecastData(locationId, yearsAhead, {
      basis,
      option,
      scenario: scenarioValue,
      season,
    });
    return createCachedDataRouteResponse(data ?? null);
  } catch (error) {
    return createDataRouteErrorResponse(error, "Failed to fetch forecast data");
  }
}
