import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globalSetup: ["./src/testing/global-setup.ts"],
    globals: true,
    include: [
      "src/**/*.db.test.js",
      "src/**/*.db.test.jsx",
      "src/**/*.db.test.ts",
      "src/**/*.db.test.tsx",
    ],
    setupFiles: ["./vitest.setup.ts"],
  },
});
