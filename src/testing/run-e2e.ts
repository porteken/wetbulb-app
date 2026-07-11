import { spawn } from "node:child_process";

import {
  applyPostgresEnv,
  seedTestPostgres,
  startTestPostgres,
  stopTestPostgres,
} from "./global-setup";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const getWrappedCommand = (arguments_: string[]) =>
  arguments_
    .filter((argument, index) => !(argument === "--" && index > 0))
    .join(" ");

const exitCodeFromSignal = (signal: NodeJS.Signals | null) => {
  if (signal === "SIGINT") {
    return 130;
  }

  if (signal === "SIGTERM") {
    return 143;
  }

  return 1;
};

async function main() {
  process.env.NEXT_PUBLIC_E2E_TEST ??= "true";
  process.env.E2E_USE_RUNTIME_MOCKS ??= "false";
  process.env.PLAYWRIGHT_TEST ??= "1";

  let container: StartedPostgreSqlContainer | undefined;
  const useRuntimeMocks = process.env.E2E_USE_RUNTIME_MOCKS === "true";

  if (useRuntimeMocks) {
    console.warn("E2E runtime DB mocks enabled; skipping PostgreSQL startup.");
  } else {
    container = await startTestPostgres();
    try {
      await seedTestPostgres(container);
      applyPostgresEnv(container);
    } catch (error) {
      await stopTestPostgres(container);
      container = undefined;
      throw error;
    }
  }

  let tornDown = false;
  const safeTeardown = async () => {
    if (tornDown) {
      return;
    }

    tornDown = true;
    await stopTestPostgres(container);
    container = undefined;
  };

  // process.argv[2...] will contain the command to run, e.g. "playwright test" or "pnpm build && playwright test"
  const command = getWrappedCommand(process.argv.slice(2));
  if (!command) {
    console.error("No command provided to run-e2e.ts");
    await safeTeardown();
    return 1;
  }

  const child = spawn(command, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  let signalExitCode: number | undefined;

  const forwardSignal = (signal: NodeJS.Signals, fallbackExitCode: number) => {
    signalExitCode ??= fallbackExitCode;

    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.once("SIGINT", () => {
    forwardSignal("SIGINT", 130);
  });

  process.once("SIGTERM", () => {
    forwardSignal("SIGTERM", 143);
  });

  try {
    return await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        resolve(signalExitCode ?? code ?? exitCodeFromSignal(signal));
      });
    });
  } finally {
    await safeTeardown();
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error("Error in run-e2e wrapper:", error);
  process.exitCode = 1;
}
