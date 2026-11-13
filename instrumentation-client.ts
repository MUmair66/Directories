/**
 * Browser error monitoring. Sentry is loaded lazily and only when NEXT_PUBLIC_SENTRY_DSN is set,
 * so it adds nothing to the bundle or to Core Web Vitals otherwise.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  import("@sentry/nextjs").then((Sentry) =>
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    }),
  );
}
