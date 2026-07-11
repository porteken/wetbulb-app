import * as Sentry from "@sentry/nextjs";

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const isE2ETestRun = process.env.NEXT_PUBLIC_E2E_TEST === "true";
const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE);

Sentry.init({
  debug: false,
  dsn: "https://6619376332d420d45e48ed32bcb5faf5@o4509742136950784.ingest.us.sentry.io/4509742137606144",
  enabled: !isE2ETestRun,
  enableLogs: true,
  tracesSampleRate: Number.isFinite(tracesSampleRate)
    ? tracesSampleRate
    : DEFAULT_TRACES_SAMPLE_RATE,
});
