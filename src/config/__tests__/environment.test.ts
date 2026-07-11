import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const loadEnvironmentModule = async () => import("../environment");

const setBaseEnvironment = () => {
  process.env.E2E_USE_RUNTIME_MOCKS = "false";
  process.env.NEXT_PUBLIC_E2E_TEST = "false";
  process.env.PGDATABASE = "wetbulb";
  process.env.PGHOST = "localhost";
  process.env.PGPASSWORD = "password";
  process.env.PGPORT = "5432";
  process.env.PGSSLMODE = "require";
  process.env.PGUSER = "postgres";
};

describe("environment", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  describe("getPublicEnvironment", () => {
    it("returns the configured public environment", async () => {
      setBaseEnvironment();

      const { getPublicEnvironment } = await loadEnvironmentModule();

      expect(getPublicEnvironment()).toStrictEqual({
        NEXT_PUBLIC_E2E_TEST: "false",
      });
    });

    it("defaults the E2E flag when absent", async () => {
      setBaseEnvironment();
      delete process.env.NEXT_PUBLIC_E2E_TEST;

      const { getPublicEnvironment } = await loadEnvironmentModule();

      expect(getPublicEnvironment()).toStrictEqual({
        NEXT_PUBLIC_E2E_TEST: "false",
      });
    });
  });

  describe("getServerDatabaseEnvironment", () => {
    it("returns the configured PostgreSQL environment", async () => {
      setBaseEnvironment();

      const { getServerDatabaseEnvironment } = await loadEnvironmentModule();

      expect(getServerDatabaseEnvironment()).toStrictEqual({
        PGDATABASE: "wetbulb",
        PGHOST: "localhost",
        PGPASSWORD: "password",
        PGPORT: 5432,
        PGSSLMODE: "require",
        PGUSER: "postgres",
      });
    });

    it("throws when a required PostgreSQL variable is absent", async () => {
      setBaseEnvironment();
      delete process.env.PGHOST;

      const { getServerDatabaseEnvironment } = await loadEnvironmentModule();

      expect(() => getServerDatabaseEnvironment()).toThrow("PGHOST");
    });
  });

  describe("getServerTestingEnvironment", () => {
    it("returns the configured server testing environment", async () => {
      setBaseEnvironment();
      process.env.E2E_USE_RUNTIME_MOCKS = "true";

      const { getServerTestingEnvironment, shouldUseRuntimeDbMocks } =
        await loadEnvironmentModule();

      expect(getServerTestingEnvironment()).toStrictEqual({
        E2E_USE_RUNTIME_MOCKS: "true",
      });
      expect(shouldUseRuntimeDbMocks()).toBe(true);
    });

    it("defaults runtime DB mocks off when absent", async () => {
      setBaseEnvironment();
      delete process.env.E2E_USE_RUNTIME_MOCKS;

      const { getServerTestingEnvironment, shouldUseRuntimeDbMocks } =
        await loadEnvironmentModule();

      expect(getServerTestingEnvironment()).toStrictEqual({
        E2E_USE_RUNTIME_MOCKS: "false",
      });
      expect(shouldUseRuntimeDbMocks()).toBe(false);
    });
  });
});
