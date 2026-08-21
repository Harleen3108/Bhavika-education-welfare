import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { env } from "@/lib/env";

/**
 * Authenticated encryption for stored PII (Aadhaar, PAN).
 *
 * AES-256-GCM. The key is derived from `AUTH_SECRET` with scrypt and a fixed,
 * app-specific salt, so no extra environment variable is required and every
 * deployment that can issue sessions can also read its own KYC data — while a
 * database dump on its own reveals nothing. GCM's auth tag means tampered
 * ciphertext fails loudly on decrypt rather than returning garbage.
 *
 * CAVEAT: rotating `AUTH_SECRET` re-keys this, so previously stored ciphertext
 * would no longer decrypt. That is an acceptable trade for KYC records (they can
 * be re-collected) and is documented here so it is not a surprise.
 */
const KEY = scryptSync(env.AUTH_SECRET, "bhavika/idcard-pii/v1", 32);
const ALGO = "aes-256-gcm";

/** Encrypt a UTF-8 string to `ivB64.tagB64.ctB64`. */
export function encryptPII(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

/** Reverse of {@link encryptPII}. Throws if the payload is malformed or tampered. */
export function decryptPII(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed PII ciphertext.");
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
