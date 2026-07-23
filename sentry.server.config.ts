import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6619376332d420d45e48ed32bcb5faf5@o4509742136950784.ingest.us.sentry.io/4509742137606144",

  tracesSampleRate: 1,

  enableLogs: true,

  dataCollection: {},
});
