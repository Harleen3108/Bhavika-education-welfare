import { handle, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { adminListCoupons, type AdminCouponRow } from "@/server/services/admin-read.service";
import { CouponStatus } from "@/lib/enums";

export const runtime = "nodejs";

/** Rows one export may contain. Mirrors the service's own export ceiling. */
const EXPORT_LIMIT = 5000;

const STATUSES = Object.values(CouponStatus) as string[];

const COLUMNS = [
  "Code",
  "Member",
  "Email",
  "Value (INR)",
  "Points spent",
  "Status",
  "Source",
  "Issued at",
  "Expires at",
  "Redeemed at",
  "Store reference",
] as const;

/**
 * One CSV field.
 *
 * Everything is quoted, so a member's name containing a comma cannot shift the
 * columns. The leading-apostrophe guard is not cosmetic: `externalRef` is
 * written by the partner store and a member's name is written by the member, so
 * a value beginning `=`, `+`, `-` or `@` would be executed as a formula the
 * moment an admin opens the file in Excel or Sheets.
 */
function cell(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(rows: AdminCouponRow[]): string {
  const lines = [COLUMNS.map(cell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        // Dates go out as ISO 8601 rather than the IST display format used on
        // screen: an export is read by a spreadsheet or a reconciliation script,
        // and "18 Aug 2026, 10:30" is ambiguous to both.
        cell(r.code),
        cell(r.member),
        cell(r.email),
        cell(r.valueRupees),
        cell(r.pointsSpent),
        cell(r.status),
        cell(r.source),
        cell(r.issuedAt),
        cell(r.expiresAt),
        cell(r.redeemedAt),
        cell(r.externalRef),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

/**
 * The coupon ledger for admin tooling.
 *
 * `?format=csv` returns the full filtered set (up to `EXPORT_LIMIT`) as a
 * download — the ledger an admin reconciles against the partner store's own
 * records, which is exactly the thing a paginated screen cannot be used for.
 * Anything else returns the same page the console renders, as JSON.
 *
 * Admin-gated by `requireAdmin()` on the way in, like every other /api/admin
 * route: coupon codes are bearer instruments and this endpoint lists them.
 */
export const GET = handle(async (req) => {
  await requireAdmin();

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() || undefined;
  const rawStatus = sp.get("status") ?? "";
  const status = STATUSES.includes(rawStatus) ? rawStatus : undefined;

  if (sp.get("format") === "csv") {
    const data = await adminListCoupons({ q, status, page: 1, pageSize: EXPORT_LIMIT });
    const stamp = new Date().toISOString().slice(0, 10);
    // U+FEFF built from its code point so the marker cannot be lost to an
    // editor or a copy-paste that strips invisible characters.
    const bom = String.fromCharCode(0xfeff);
    return new Response(
      // BOM: without it Excel reads the file as the system codepage and mangles
      // every Devanagari member name.
      `${bom}${toCsv(data.items)}`,
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bhavika-coupons-${stamp}.csv"`,
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const page = Math.max(1, Number(sp.get("page")) || 1);
  return ok(await adminListCoupons({ q, status, page }));
});
