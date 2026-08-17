import "server-only";
import { ZodError } from "zod";
import { requireAdmin, AuthError, type SessionUser } from "@/server/auth/session";
import { DomainError } from "@/server/http";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Wrap an admin server action: enforces admin auth, runs the body, and turns
 * thrown Zod/Auth/Domain errors into a structured, user-safe result.
 */
export async function runAdmin<T>(
  fn: (admin: SessionUser) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const admin = await requireAdmin();
    const data = await fn(admin);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const path = issue.path.join(".");
        if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      return { ok: false, error: "Please correct the highlighted fields.", fieldErrors };
    }
    if (err instanceof AuthError) return { ok: false, error: err.message };
    if (err instanceof DomainError) return { ok: false, error: err.message };
    console.error("[admin-action] error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
