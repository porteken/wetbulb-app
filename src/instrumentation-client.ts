import * as Sentry from "@sentry/nextjs";

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const isE2ETestRun = process.env.NEXT_PUBLIC_E2E_TEST === "true";
const isProductionBuild = process.env.NODE_ENV === "production";
const shouldEnableReplay =
  !isE2ETestRun &&
  isProductionBuild &&
  process.env.NEXT_PUBLIC_SENTRY_REPLAY_ENABLED === "true";
const tracesSampleRate = Number(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
);
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
Sentry.init({
  debug: false,

  dsn: "https://6619376332d420d45e48ed32bcb5faf5@o4509742136950784.ingest.us.sentry.io/4509742137606144",
  enabled: !isE2ETestRun,

  enableLogs: true,
  integrations: shouldEnableReplay ? [Sentry.replayIntegration()] : [],

  replaysOnErrorSampleRate: shouldEnableReplay ? 1 : 0,

  replaysSessionSampleRate: shouldEnableReplay ? 0.1 : 0,

  tracesSampleRate: Number.isFinite(tracesSampleRate)
    ? tracesSampleRate
    : DEFAULT_TRACES_SAMPLE_RATE,
});
