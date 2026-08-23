import { handle, ok } from "@/server/http";
import { listActiveCategories } from "@/server/services/donation.service";

export const runtime = "nodejs";

/** Active donation causes for the public donate form (and the mobile app). */
export const GET = handle(async () => {
  return ok({ causes: await listActiveCategories() });
});
