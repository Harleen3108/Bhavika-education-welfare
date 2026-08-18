import "server-only";
import { createHash } from "crypto";
import { env } from "@/lib/env";

/**
 * Address helpers, deliberately kept in their own leaf module.
 *
 * They live apart from `server/http/index.ts` because that file imports the
 * Auth.js error type, which drags the whole next-auth stack in behind it. Any
 * service that only needs to read an IP should not pay for that — and could not
 * be unit tested at all while it did.
 */

/** Best-guess client IP from proxy headers (Vercel-aware). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

/** One-way, salted hash of an IP — abuse correlation without storing the address. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${env.AUTH_SECRET}`).digest("hex").slice(0, 32);
}
