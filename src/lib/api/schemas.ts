import { z, ZodError } from "zod";

const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

const finiteNumberSchema = z.coerce
  .number()
  .refine(Number.isFinite, "Expected a finite number");
const nonNegativeIntegerSchema = z.coerce.number().int().nonnegative();
const yearSchema = z.coerce.number().int().min(MIN_YEAR).max(MAX_YEAR);

const trendGraphRowSchema = z.object({
  location_id: nonNegativeIntegerSchema,
  wetbulb: finiteNumberSchema,
  year: yearSchema,
});

const referenceGraphRowSchema = z.object({
  date: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date format"),
  location_id: nonNegativeIntegerSchema,
  wetbulb: finiteNumberSchema,
  year: z.coerce.string().optional(),
});

const forecastRowSchema = z.object({
  location_id: nonNegativeIntegerSchema.optional(),
  lower: finiteNumberSchema,
  wetbulb: finiteNumberSchema,
  upper: finiteNumberSchema,
  year: yearSchema,
});

const historicalYearRowSchema = z.object({
  year: yearSchema,
});

const locationRowSchema = z.object({
  city: z.string().min(1),
  lat: finiteNumberSchema,
  lng: finiteNumberSchema,
  location_id: nonNegativeIntegerSchema,
  state: z.string().min(1),
});

const rankingViewRowSchema = z.object({
  avg_wetbulb: finiteNumberSchema,
  change_from_2000: finiteNumberSchema.nullable(),
  city: z.string().min(1),
  future_lower: finiteNumberSchema.nullable(),
  future_upper: finiteNumberSchema.nullable(),
  location_id: nonNegativeIntegerSchema,
  max_wetbulb: finiteNumberSchema.nullable(),
  p5: finiteNumberSchema.nullable(),
  p95: finiteNumberSchema.nullable(),
  state: z.string().min(1),
  year: yearSchema,
});

const trendGraphDataResponseSchema = z.object({
  increase_per_year: finiteNumberSchema,
  trendline_wetbulbs: z.array(finiteNumberSchema),
  year_wetbulbs: z.array(finiteNumberSchema),
  years: z.array(yearSchema),
});

const referenceGraphDataResponseSchema = z.object({
  dates: z.array(
    z
      .string()
      .min(1)
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Invalid date format",
      ),
  ),
  wetbulbs: z.array(finiteNumberSchema),
});

const forecastGraphDataResponseSchema = z.object({
  forecastValues: z.array(finiteNumberSchema),
  forecastYears: z.array(yearSchema),
  lowerBound10: z.array(finiteNumberSchema),
  upperBound90: z.array(finiteNumberSchema),
  scenario: z.enum(["ssp126", "ssp245", "ssp370"]).default("ssp245"),
});

const formatIssuePath = (issuePath: PropertyKey[]) =>
  issuePath.length === 0 ? "response" : issuePath.join(".");

export const formatSchemaValidationError = (
  resource: string,
  error: ZodError,
) => {
  const issue = error.issues[0];

  if (!issue) {
    return `${resource} response validation failed`;
  }

  return `${resource} response validation failed at ${formatIssuePath(
    issue.path,
  )}: ${issue.message}`;
};

export const parseTrendGraphRows = (rows: unknown) =>
  z.array(trendGraphRowSchema).parse(rows);

export const parseReferenceGraphRows = (rows: unknown) =>
  z.array(referenceGraphRowSchema).parse(rows);

export const parseForecastRows = (rows: unknown) =>
  z.array(forecastRowSchema).parse(rows);

export const parseHistoricalYearRows = (rows: unknown) =>
  z.array(historicalYearRowSchema).parse(rows);

export const parseLocationRows = (rows: unknown) =>
  z.array(locationRowSchema).parse(rows);

export const parseRankingViewRows = (rows: unknown) =>
  z.array(rankingViewRowSchema).parse(rows);

export const parseTrendGraphDataResponse = (payload: unknown) =>
  trendGraphDataResponseSchema.parse(payload);

export const parseReferenceGraphDataResponse = (payload: unknown) => {
  const parsed = referenceGraphDataResponseSchema.parse(payload);

  return {
    dates: parsed.dates.map((date) => new Date(date)),
    wetbulbs: parsed.wetbulbs,
  };
};

export const parseForecastDataResponse = (payload: unknown) =>
  forecastGraphDataResponseSchema
    .nullable()
    .transform((value) => value ?? undefined)
    .parse(payload);

export const isSchemaValidationError = (error: unknown): error is ZodError =>
  error instanceof ZodError;
