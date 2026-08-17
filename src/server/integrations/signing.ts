import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/**
 * Minimal signed-token + payload-signature helpers for the future Jai Maa Durga
 * integration. Tokens are short-lived and carry only a reference id (never a
 * points balance) — the external platform confirms via a server-to-server
 * webhook, so a URL is never the source of truth.
 */

function secret(): string {
  // Fall back to AUTH_SECRET so signing never crashes in Phase 1 (integration off).
  return env.JMD_INTEGRATION_SECRET || env.AUTH_SECRET;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export type SignedPayload = Record<string, unknown> & { exp: number };

/** Create a signed, expiring token: `<base64url(payload)>.<hmac>`. */
export function createSignedToken(
  payload: Record<string, unknown>,
  ttlSeconds = 300,
  nowMs = Date.now(),
): string {
  const body: SignedPayload = { ...payload, exp: Math.floor(nowMs / 1000) + ttlSeconds };
  const encoded = b64url(JSON.stringify(body));
  return `${encoded}.${hmac(encoded)}`;
}

/** Verify a signed token; returns the payload if valid + unexpired, else null. */
export function verifySignedToken(token: string, nowMs = Date.now()): SignedPayload | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = hmac(encoded);
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SignedPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < nowMs) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Verify an HMAC signature over a raw webhook body (server-to-server auth). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return safeEqual(signature, hmac(rawBody));
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
