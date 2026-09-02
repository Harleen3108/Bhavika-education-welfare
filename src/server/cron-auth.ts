import "server-only";
import { env } from "@/lib/env";

/**
 * Authorise a scheduled-job request. Vercel Cron sends the configured
 * `CRON_SECRET` as a Bearer token. With no secret set, nobody is authorised —
 * so the cron endpoints can never be triggered from the open internet.
 */
export function isCronAuthorized(req: Request): boolean {
  if (!env.CRON_SECRET) return false;
  return req.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`;
}
