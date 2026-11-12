import "server-only";
import { z } from "zod";

/**
 * Server environment, validated lazily so `next build` works without every
 * third-party key present. Required keys throw only when first used.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PRIVATE_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
});

type Env = z.infer<typeof schema>;

export function env<K extends keyof Env>(key: K): Env[K] {
  return process.env[key] as Env[K];
}

export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable ${key}`);
  return value as NonNullable<Env[K]>;
}

export const isProd = process.env.NODE_ENV === "production";
