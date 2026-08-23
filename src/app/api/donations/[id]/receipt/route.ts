import { handle } from "@/server/http";
import { getSessionUser } from "@/server/auth/session";
import { getCertificateData } from "@/server/services/donation.service";
import { renderDonationCertificate } from "@/server/services/donation-certificate";

export const runtime = "nodejs";

/**
 * Download a donation receipt / certificate as PDF.
 *
 * Authorised to an admin, the linked member, the email owner, or anyone holding
 * the receipt token `?t=` from the emailed link — so a guest who donated without
 * an account can still fetch their own receipt, but no one can guess another's.
 */
export const GET = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t") || undefined;
  const user = await getSessionUser();

  const data = await getCertificateData(id, {
    id: user?.id,
    email: user?.email,
    role: user?.role,
    token,
  });
  const pdf = await renderDonationCertificate(data);
  const filename = `bhavika-receipt-${data.receiptNo.replace(/[^\w-]+/g, "-")}.pdf`;

  return new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
});
