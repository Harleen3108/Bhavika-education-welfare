import { handle } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getDownloadableCard } from "@/server/services/idcard.service";
import { renderIdCardPdf } from "@/server/services/idcard-pdf";

export const runtime = "nodejs";

/**
 * Stream an approved ID card as a PDF.
 *
 * Authorised in the service to the card's owner or any admin — a card is
 * identity, so one member must never be able to pull another's by guessing an
 * id. Rendering is on demand (nothing is cached to disk), so the card always
 * reflects the latest approved data.
 */
export const GET = handle(async (_req, ctx) => {
  const user = await requireUser();
  const { cardId } = await ctx.params;
  const print = await getDownloadableCard(cardId, { id: user.id, role: user.role });
  const pdf = await renderIdCardPdf(print);
  // Copy into an ArrayBuffer-backed view so it satisfies BlobPart under TS's
  // stricter typed-array typing; the PDF is small, so the copy is cheap.
  return new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="bhavika-id-${print.memberId}.pdf"`,
      "cache-control": "no-store",
    },
  });
});
