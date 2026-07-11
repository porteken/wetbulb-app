import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_E2E_TEST: z.enum(["false", "true"]).default("false"),
});

const serverDatabaseEnvironmentSchema = z.object({
  PGDATABASE: z.string().min(1),
  PGHOST: z.string().min(1),
  PGPASSWORD: z.string().min(1),
  PGPORT: z.coerce.number().int().positive(),
  PGSSLMODE: z
    .enum(["allow", "disable", "prefer", "require", "verify-ca", "verify-full"])
    .default("require"),
  PGUSER: z.string().min(1),
});

const serverTestingEnvironmentSchema = z.object({
  E2E_USE_RUNTIME_MOCKS: z.enum(["false", "true"]).default("false"),
});

type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type ServerDatabaseEnvironment = z.infer<
  typeof serverDatabaseEnvironmentSchema
>;
type ServerTestingEnvironment = z.infer<typeof serverTestingEnvironmentSchema>;

let cachedPublicEnvironment: PublicEnvironment | undefined;
let cachedServerDatabaseEnvironment: ServerDatabaseEnvironment | undefined;
let cachedServerTestingEnvironment: ServerTestingEnvironment | undefined;

const formatEnvironmentIssues = (
  issues: Array<{ message: string; path: PropertyKey[] }>,
) =>
  issues
    .map((issue) => {
      const path = issue.path.join(".") || "env";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

export const getPublicEnvironment = (): PublicEnvironment => {
  if (cachedPublicEnvironment) {
    return cachedPublicEnvironment;
  }

  const parsed = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_E2E_TEST: process.env.NEXT_PUBLIC_E2E_TEST,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables: ${formatEnvironmentIssues(parsed.error.issues)}`,
    );
  }

  cachedPublicEnvironment = parsed.data;
  return cachedPublicEnvironment;
};

export const getServerDatabaseEnvironment = (): ServerDatabaseEnvironment => {
  if (cachedServerDatabaseEnvironment) {
    return cachedServerDatabaseEnvironment;
  }

  const parsed = serverDatabaseEnvironmentSchema.safeParse({
    PGDATABASE: process.env.PGDATABASE,
    PGHOST: process.env.PGHOST,
    PGPASSWORD: process.env.PGPASSWORD,
    PGPORT: process.env.PGPORT,
    PGSSLMODE: process.env.PGSSLMODE,
    PGUSER: process.env.PGUSER,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables: ${formatEnvironmentIssues(parsed.error.issues)}`,
    );
  }

  cachedServerDatabaseEnvironment = parsed.data;
  return cachedServerDatabaseEnvironment;
};

export const getServerTestingEnvironment = (): ServerTestingEnvironment => {
  if (cachedServerTestingEnvironment) {
    return cachedServerTestingEnvironment;
  }

  const parsed = serverTestingEnvironmentSchema.safeParse({
    E2E_USE_RUNTIME_MOCKS: process.env.E2E_USE_RUNTIME_MOCKS,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid server testing environment variables: ${formatEnvironmentIssues(parsed.error.issues)}`,
    );
  }

  cachedServerTestingEnvironment = parsed.data;
  return cachedServerTestingEnvironment;
};

export const shouldUseRuntimeDbMocks = () =>
  getServerTestingEnvironment().E2E_USE_RUNTIME_MOCKS === "true";

// True for a real production deployment; false for local/dev and for prod
// e2e test runs, which build with NODE_ENV=production but serve over
// http://localhost and set NEXT_PUBLIC_E2E_TEST=true before the build.
export const isProductionRuntime = (): boolean =>
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_E2E_TEST !== "true";
