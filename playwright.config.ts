import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

const PRODUCTION_TIMEOUT_SECONDS = 240;
const DEVELOPMENT_TIMEOUT_SECONDS = 180;
const PRODUCTION_WEB_SERVER_TIMEOUT = PRODUCTION_TIMEOUT_SECONDS * 1000;
const DEVELOPMENT_WEB_SERVER_TIMEOUT = DEVELOPMENT_TIMEOUT_SECONDS * 1000;
const CI_RETRIES = 2;
const LOCAL_RETRIES = 1;
const GLOBAL_TIMEOUT = 60_000;
const ACTION_TIMEOUT = 30_000;
const NAVIGATION_TIMEOUT = 30_000;
const CI_WORKERS = 1;
const LOCAL_WORKERS = 1;

const projectRoot = import.meta.dirname;
const runningOnLinux = process.platform === "linux";
const runningInsideVSCodeSnap =
  process.env.GIO_LAUNCHED_DESKTOP_FILE?.includes("/snap/") === true ||
  process.env.GTK_EXE_PREFIX?.startsWith("/snap/") === true ||
  process.env.GTK_PATH?.includes("/snap/") === true;

const createWebKitLaunchEnvironment = () => {
  if (!runningOnLinux || !runningInsideVSCodeSnap) {
    return null;
  }

  const launchEnvironment = { ...process.env };

  delete launchEnvironment.GIO_LAUNCHED_DESKTOP_FILE;
  delete launchEnvironment.GIO_LAUNCHED_DESKTOP_FILE_PID;
  delete launchEnvironment.GIO_MODULE_DIR;
  delete launchEnvironment.GIO_MODULE_DIR_VSCODE_SNAP_ORIG;
  delete launchEnvironment.GTK_EXE_PREFIX;
  delete launchEnvironment.GTK_EXE_PREFIX_VSCODE_SNAP_ORIG;
  delete launchEnvironment.GTK_IM_MODULE_FILE;
  delete launchEnvironment.GTK_IM_MODULE_FILE_VSCODE_SNAP_ORIG;
  delete launchEnvironment.GTK_PATH;
  delete launchEnvironment.GTK_PATH_VSCODE_SNAP_ORIG;

  const originalXdgDataDirs = process.env.XDG_DATA_DIRS_VSCODE_SNAP_ORIG;
  if (originalXdgDataDirs && originalXdgDataDirs !== "") {
    launchEnvironment.XDG_DATA_DIRS = originalXdgDataDirs;
  } else {
    delete launchEnvironment.XDG_DATA_DIRS;
  }

  const originalXdgDataHome = process.env.XDG_DATA_HOME_VSCODE_SNAP_ORIG;
  if (originalXdgDataHome && originalXdgDataHome !== "") {
    launchEnvironment.XDG_DATA_HOME = originalXdgDataHome;
  } else if (process.env.HOME) {
    launchEnvironment.XDG_DATA_HOME = `${process.env.HOME}/.local/share`;
  } else {
    delete launchEnvironment.XDG_DATA_HOME;
  }

  return launchEnvironment;
};

const webkitLaunchEnvironment = createWebKitLaunchEnvironment();
const webkitLaunchOptions =
  webkitLaunchEnvironment === null
    ? undefined
    : { env: webkitLaunchEnvironment };

const playwrightPort =
  process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? "3000";
const playwrightBaseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${playwrightPort}`;
const playwrightServerMode =
  process.env.PLAYWRIGHT_SERVER_MODE === "development"
    ? "development"
    : "production";
const enableWebKitProjects =
  process.env.PLAYWRIGHT_ENABLE_WEBKIT === "true" ||
  Boolean(process.env.CI) ||
  !runningOnLinux;
const webServerCommand =
  playwrightServerMode === "production"
    ? "pnpm build && pnpm start"
    : "pnpm dev";
const webServerTimeout =
  playwrightServerMode === "production"
    ? PRODUCTION_WEB_SERVER_TIMEOUT
    : DEVELOPMENT_WEB_SERVER_TIMEOUT;
const webServerEnvironment = {
  ...process.env,
  E2E_USE_RUNTIME_MOCKS: process.env.E2E_USE_RUNTIME_MOCKS ?? "false",
  NEXT_PUBLIC_E2E_TEST: process.env.NEXT_PUBLIC_E2E_TEST ?? "false",
  PLAYWRIGHT_TEST: process.env.PLAYWRIGHT_TEST ?? "1",
  PORT: playwrightPort,
};

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    ...(enableWebKitProjects
      ? [
          {
            name: "webkit",
            use: {
              ...devices["Desktop Safari"],
              launchOptions: webkitLaunchOptions,
            },
          },
        ]
      : []),

    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
        launchOptions: webkitLaunchOptions,
      },
    },
  ],

  reporter: process.env.CI ? "github" : "list",
  retries: process.env.CI ? CI_RETRIES : LOCAL_RETRIES,
  testDir: "./e2e",
  timeout: GLOBAL_TIMEOUT,

  use: {
    actionTimeout: ACTION_TIMEOUT,
    baseURL: playwrightBaseURL,
    navigationTimeout: NAVIGATION_TIMEOUT,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  webServer: {
    command: webServerCommand,
    cwd: projectRoot,
    env: webServerEnvironment,
    reuseExistingServer: !process.env.CI,
    timeout: webServerTimeout,
    url: playwrightBaseURL,
  },

  workers: process.env.CI ? CI_WORKERS : LOCAL_WORKERS,
});
