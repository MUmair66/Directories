import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

type Bucket = "review" | "message" | "claim" | "contact" | "auth" | "api" | "verify" | "upload" | "ticket" | "write";

const LIMITS: Record<Bucket, [number, `${number} ${"s" | "m" | "h"}`]> = {
  review: [5, "1 h"],
  message: [10, "1 h"],
  claim: [5, "1 h"],
  contact: [5, "1 h"],
  auth: [10, "1 m"],
  api: [60, "1 m"],
  verify: [10, "1 h"],
  upload: [60, "1 h"],
  ticket: [20, "1 h"],
  write: [120, "1 m"],
};

const limiters = new Map<Bucket, Ratelimit>();

/**
 * Sliding-window rate limit per bucket and identifier (user id, API key id or IP).
 * Without Upstash configured (local dev) every request is allowed.
 */
export async function rateLimit(bucket: Bucket, identifier: string) {
  const r = getRedis();
  if (!r) return { success: true, remaining: Infinity, reset: 0 };
  let limiter = limiters.get(bucket);
  if (!limiter) {
    const [count, window] = LIMITS[bucket];
    limiter = new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(count, window), prefix: `rl:${bucket}` });
    limiters.set(bucket, limiter);
  }
  return limiter.limit(identifier);
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
