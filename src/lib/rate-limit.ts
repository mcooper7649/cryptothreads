import type { NextRequest } from "next/server";

/**
 * Fixed-window in-memory rate limiter. Good enough for a single self-hosted
 * instance; swap for Redis/Upstash if this ever runs on more than one node.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.ip ||
    "unknown"
  );
}

/** True when the caller is still under `limit` requests per `windowMs`. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) {
    buckets.forEach((b, k) => {
      if (b.reset <= now) buckets.delete(k);
    });
  }
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= limit;
}
