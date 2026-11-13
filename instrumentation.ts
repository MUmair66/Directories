import type { Instrumentation } from "next";

/**
 * Server/edge error monitoring with Sentry. No-op when SENTRY_DSN is unset,
 * so local dev and preview builds work without a Sentry project.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.1 : 1.0,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
