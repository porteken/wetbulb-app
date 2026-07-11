import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    coverage: {
      exclude: [
        "node_modules/**",
        ".next/**",
        "tests/**",
        "src/utils/__tests__/test-utilities.ts",
        "src/proxy.ts",
        "src/lib/utils.ts",
        "src/components/ui/**",
        "src/components/modal.tsx",
        "src/config/**",
        "src/instrumentation-client.ts",
        "src/instrumentation.ts",
        "src/testing/**",
        "**/*types.ts",
        "**/*.d.ts",
        "**/index.ts",
        "**/constants.ts",
        "e2e/**",
        "next.config.ts",
        "playwright.config.ts",
        "postcss.config.mjs",
        "sentry.edge.config.ts",
        "sentry.server.config.ts",
        "vitest.db.config.ts",
        "vitest.config.ts",
        "vitest.setup.ts",
      ],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
    },
    environment: "jsdom",
    exclude: [
      "node_modules/**",
      ".next/**",
      "tests/**",
      "src/utils/__tests__/test-utilities.ts",
      "**/*.db.test.*",
    ],
    globals: true,
    include: [
      "src/**/__tests__/**/*.test.{js,jsx,ts,tsx}",
      "src/**/*.test.{js,jsx,ts,tsx}",
    ],
    setupFiles: ["./vitest.setup.ts"],
  },
});
