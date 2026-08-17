import { z } from "zod";
import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { initiateRedemption } from "@/server/services/integration.service";

export const runtime = "nodejs";

const schema = z.object({ points: z.coerce.number().int().positive() });

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const { points } = schema.parse(body);
  const result = await initiateRedemption(user.id, points);
  return ok({ redirectUrl: result.redirectUrl, referenceId: result.referenceId });
});
