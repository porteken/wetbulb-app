import { FetchReferenceGraphData } from "@/lib/api/fetch-server";
import { DEFAULT_GRAPH_SEASON, normalizeGraphSeason } from "@/lib/constants";
import { validateLocationId, validateYear } from "@/lib/utils/validation";
import { NextResponse } from "next/server";

import {
  createCachedDataRouteResponse,
  createDataRouteErrorResponse,
} from "../response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locationId = Number(url.searchParams.get("locationId"));
  const year = url.searchParams.get("year") ?? "";
  const season = normalizeGraphSeason(
    url.searchParams.get("season") ?? DEFAULT_GRAPH_SEASON,
  );

  if (!validateLocationId(locationId)) {
    return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
  }

  if (!validateYear(year)) {
    return NextResponse.json(
      { error: "Invalid reference year" },
      { status: 400 },
    );
  }

  try {
    const data = await FetchReferenceGraphData(year, locationId, season);
    return createCachedDataRouteResponse(data);
  } catch (error) {
    return createDataRouteErrorResponse(
      error,
      "Failed to fetch reference graph data",
    );
  }
}
