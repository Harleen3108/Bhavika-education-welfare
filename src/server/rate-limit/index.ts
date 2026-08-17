import "server-only";
import { env } from "@/lib/env";

/**
 * Rate limiting with an Upstash Redis backend when configured (works across
 * serverless instances), falling back to a per-instance in-memory limiter for
 * local dev. Fixed-window algorithm.
 */

export type RateResult = { success: boolean; remaining: number; reset: number };

// ---- In-memory fallback (dev / when Upstash not configured) ----
const memoryStore = new Map<string, { count: number; reset: number }>();

function memoryLimit(key: string, limit: number, windowSeconds: number): RateResult {
  const now = Date.now();
  const rec = memoryStore.get(key);
  if (!rec || rec.reset < now) {
    const reset = now + windowSeconds * 1000;
    memoryStore.set(key, { count: 1, reset });
    return { success: true, remaining: limit - 1, reset };
  }
  rec.count += 1;
  const success = rec.count <= limit;
  return { success, remaining: Math.max(0, limit - rec.count), reset: rec.reset };
}

// ---- Upstash backend (lazy import so dev doesn't require the package at boot) ----
let redis: import("@upstash/redis").Redis | null = null;
function getRedis() {
  if (redis) return redis;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

async function redisLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateResult> {
  const client = getRedis();
  if (!client) return memoryLimit(key, limit, windowSeconds);
  const redisKey = `rl:${key}`;
  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.expire(redisKey, windowSeconds);
  }
  const ttl = await client.ttl(redisKey);
  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: Date.now() + Math.max(0, ttl) * 1000,
  };
}

/**
 * Check + consume one unit against a keyed bucket.
 * @param identifier  Unique bucket key (e.g. `contact:1.2.3.4`).
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateResult> {
  try {
    return await redisLimit(identifier, limit, windowSeconds);
  } catch {
    // Never let a limiter outage take down the endpoint — fail open to memory.
    return memoryLimit(identifier, limit, windowSeconds);
  }
}
