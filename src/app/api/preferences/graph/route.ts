import {
  DEFAULT_REFERENCE_YEAR,
  GRAPH_MEASURE_COOKIE_NAME,
  GRAPH_SEASON_COOKIE_NAME,
  normalizeGraphSeason,
  REFERENCE_YEAR_COOKIE_NAME,
} from "@/lib/constants";
import { isSelectableReferenceYear } from "@/lib/utils/select-options";
import { isSecureCookieEnvironment } from "@/lib/utils/server-cookies";
import { validateTrendOption } from "@/lib/utils/validation";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface GraphPreferencesPayload {
  graphMeasure?: string;
  graphSeason?: string;
  referenceYear?: string;
}

const DAYS_IN_YEAR = 365;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MILLISECONDS_IN_SECOND = 1000;
const ONE_YEAR_IN_MILLISECONDS =
  DAYS_IN_YEAR *
  HOURS_IN_DAY *
  MINUTES_IN_HOUR *
  SECONDS_IN_MINUTE *
  MILLISECONDS_IN_SECOND;

const buildCookieOptions = () => ({
  expires: new Date(Date.now() + ONE_YEAR_IN_MILLISECONDS),
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: isSecureCookieEnvironment(),
});

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === "object" && val !== null && !Array.isArray(val);

export async function POST(request: Request) {
  let payload: GraphPreferencesPayload;

  try {
    const json = await request.json();

    if (!isRecord(json)) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    payload = {
      graphMeasure:
        typeof json.graphMeasure === "string" ? json.graphMeasure : undefined,
      graphSeason:
        typeof json.graphSeason === "string" ? json.graphSeason : undefined,
      referenceYear:
        typeof json.referenceYear === "string" ? json.referenceYear : undefined,
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();

  if (payload.graphMeasure !== undefined) {
    if (!validateTrendOption(payload.graphMeasure)) {
      return NextResponse.json(
        { error: "Invalid graph measure" },
        { status: 400 },
      );
    }

    cookieStore.set(
      GRAPH_MEASURE_COOKIE_NAME,
      payload.graphMeasure,
      buildCookieOptions(),
    );
  }

  if (payload.graphSeason !== undefined) {
    const normalizedSeason = normalizeGraphSeason(payload.graphSeason);

    if (normalizedSeason !== payload.graphSeason) {
      return NextResponse.json(
        { error: "Invalid graph season" },
        { status: 400 },
      );
    }

    cookieStore.set(
      GRAPH_SEASON_COOKIE_NAME,
      normalizedSeason,
      buildCookieOptions(),
    );
  }

  if (payload.referenceYear !== undefined) {
    const normalizedReferenceYear =
      payload.referenceYear || DEFAULT_REFERENCE_YEAR;

    if (!isSelectableReferenceYear(normalizedReferenceYear)) {
      return NextResponse.json(
        { error: "Invalid reference year" },
        { status: 400 },
      );
    }

    cookieStore.set(
      REFERENCE_YEAR_COOKIE_NAME,
      normalizedReferenceYear,
      buildCookieOptions(),
    );
  }

  return NextResponse.json({ ok: true });
}
