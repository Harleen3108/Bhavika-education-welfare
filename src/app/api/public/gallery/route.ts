import { handle, ok } from "@/server/http";
import { getGallery, getGalleryCategories } from "@/server/services/content.service";

export const runtime = "nodejs";
export const revalidate = 300;

/**
 * The gallery plus its category list.
 *
 * Both are returned together because the grid cannot render its filter row
 * without the categories, and a second request for a `distinct` on the same
 * collection is not worth the round trip on a 3G phone.
 */
export const GET = handle(async (req) => {
  const category = new URL(req.url).searchParams.get("category") ?? undefined;
  const [items, categories] = await Promise.all([
    getGallery(category || undefined),
    getGalleryCategories(),
  ]);
  return ok({ items, categories });
});
