import { handle, ok } from "@/server/http";
import { getTestimonials } from "@/server/services/content.service";

export const runtime = "nodejs";
export const revalidate = 300;

export const GET = handle(async (req) => {
  const raw = new URL(req.url).searchParams.get("limit");
  const parsed = Number(raw);
  // Bounded: the parameter is public, and an unbounded limit is a free way to
  // ask the database for the entire collection.
  const limit = Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : undefined;
  return ok({ testimonials: await getTestimonials(limit) });
});
