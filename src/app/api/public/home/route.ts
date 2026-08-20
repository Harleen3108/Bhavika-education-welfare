import { handle, ok } from "@/server/http";
import { getHomePageData } from "@/server/services/site-data.service";
import {
  getGallery,
  getTestimonials,
  getPartners,
} from "@/server/services/content.service";
import { getLeaderboard } from "@/server/services/leaderboard.service";
import { LeaderboardPeriod } from "@/lib/enums";

export const runtime = "nodejs";

/**
 * Everything the mobile home screen paints, in one round trip.
 *
 * Mirrors the assembly the homepage server component performs — same services,
 * same fallbacks, same preview counts — so the app and the website can never
 * show different figures for the same deployment. Revalidated rather than
 * force-dynamic: none of it is per-user.
 */
export const revalidate = 300;

export const GET = handle(async () => {
  const [home, gallery, testimonials, partners, board] = await Promise.all([
    getHomePageData(),
    getGallery().then((g) => g.slice(0, 8)),
    getTestimonials(6),
    getPartners(),
    getLeaderboard(LeaderboardPeriod.WEEKLY, undefined, 5).catch(() => null),
  ]);

  return ok({
    ...home,
    galleryPreview: gallery,
    testimonials,
    partners,
    // `null` when the board is empty or unreachable, so the client falls back
    // to the sample rows exactly as the website does rather than showing an
    // empty "Live" card.
    leaderboardPreview: board && board.rows.length > 0 ? board.rows : null,
  });
});
