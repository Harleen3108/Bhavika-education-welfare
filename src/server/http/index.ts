import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { ZodError } from "zod";
import { AuthError } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { env } from "@/lib/env";

export { DomainError };

export type ApiError = { error: string; code?: string; fields?: Record<string, string> };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra?: Partial<ApiError>) {
  return NextResponse.json<ApiError>({ error: message, ...extra }, { status });
}

/** Extract the best-guess client IP from proxy headers (Vercel-aware). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

/** One-way hash of an IP (salted with AUTH_SECRET) for abuse investigation without storing PII. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${env.AUTH_SECRET}`).digest("hex").slice(0, 32);
}

/**
 * Wrap a route handler so thrown domain errors become clean HTTP responses and
 * internal details never leak to the client.
 */
export function handle(
  fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of err.issues) {
          const path = issue.path.join(".");
          if (path && !fields[path]) fields[path] = issue.message;
        }
        return fail("Please correct the highlighted fields.", 422, {
          code: "VALIDATION",
          fields,
        });
      }
      if (err instanceof AuthError) {
        const status =
          err.code === "UNAUTHENTICATED" ? 401 : err.code === "FORBIDDEN" ? 403 : 423;
        return fail(err.message, status, { code: err.code });
      }
      if (err instanceof DomainError) {
        return fail(err.message, err.status, { code: err.code });
      }
      console.error("[api] Unhandled error:", err);
      return fail("Something went wrong. Please try again.", 500, { code: "INTERNAL" });
    }
  };
}
