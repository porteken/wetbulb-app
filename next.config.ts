import initializeBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = initializeBundleAnalyzer({
  enabled: process.env.BUNDLE_ANALYZER_ENABLED === "true",
});
const projectRoot = import.meta.dirname;

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["pg"],
  turbopack: {
    resolveAlias: {
      underscore: "lodash",
    },
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".json"],
    root: projectRoot,
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: "personal-project-0l",

  project: "javascript-nextjs",

  silent: !process.env.CI,

  widenClientFileUpload: true,

  tunnelRoute: "/monitoring",

  webpack: {
    automaticVercelMonitors: true,

    treeshake: {
      removeDebugLogging: true,
    },
  },
});
