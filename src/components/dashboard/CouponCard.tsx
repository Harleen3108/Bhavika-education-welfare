"use client";

import * as React from "react";
import { Check, Copy, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Hi } from "@/components/ui/Bilingual";
import { CouponStatus } from "@/lib/enums";
import { cn, formatDate, formatPoints } from "@/lib/utils";
import type { CouponDTO } from "@/server/services/coupon.service";

/* `CouponDTO` crosses the server/client line as a TYPE only — types are erased
   at build time, so the "server-only" coupon service never enters this bundle. */

const CONFIRM_MS = 2000;

const rupees = (n: number) => `₹${formatPoints(n)}`;

type StatusMeta = {
  en: string;
  hi: string;
  tone: React.ComponentProps<typeof Badge>["tone"];
};

/*
  "Used", not "Redeemed": redeem is the word this codebase uses internally, but
  a member reading their own coupon list wants the plain word for what happened
  to it. Hindi kept short so the badge cannot squeeze the value heading at 360px.
*/
const STATUS: Record<CouponStatus, StatusMeta> = {
  [CouponStatus.ACTIVE]: { en: "Active", hi: "चालू", tone: "success" },
  [CouponStatus.REDEEMED]: { en: "Used", hi: "इस्तेमाल हुआ", tone: "neutral" },
  [CouponStatus.EXPIRED]: { en: "Expired", hi: "समाप्त", tone: "danger" },
};

/**
 * One coupon, as the member sees it.
 *
 * `highlight` is for the coupon that was just created: same card, larger code
 * and a brand ring, so the thing they were promised is unmistakably the thing
 * on screen — and so the freshly-issued view and the list view can never drift
 * apart into two different renderings of the same coupon.
 */
export function CouponCard({
  coupon,
  highlight = false,
}: {
  coupon: CouponDTO;
  highlight?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const confirmTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(confirmTimer.current), []);

  /**
   * `navigator.clipboard` is missing on plain-http origins and rejects outright
   * inside some in-app browsers, so a denial is reported with the manual way
   * out rather than swallowed. The code stays selectable (`select-all`: one tap
   * takes the whole string) so the fallback is a real fallback.
   */
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(coupon.code);
    } catch {
      toast.error("Couldn't copy the code. Tap the code once to select it, then copy.");
      return;
    }
    toast.success("Coupon code copied!");
    setCopied(true);
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setCopied(false), CONFIRM_MS);
  };

  const meta = STATUS[coupon.status];
  const active = coupon.status === CouponStatus.ACTIVE;
  const points = formatPoints(coupon.pointsSpent);
  const issued = formatDate(coupon.issuedAt);
  const expires = formatDate(coupon.expiresAt);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface p-4 shadow-card sm:p-5",
        highlight ? "border-brand-300 ring-2 ring-brand-200" : "border-ink-200",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={meta.tone}>
          <Ticket size={13} aria-hidden />
          {meta.en}
          <Hi inline className="tracking-normal normal-case">
            {meta.hi}
          </Hi>
        </Badge>
        {active && (
          <span className="type-label tabular-nums text-brand-700">
            {coupon.daysRemaining} {coupon.daysRemaining === 1 ? "day" : "days"} left
            <Hi inline className="ml-1.5 tracking-normal normal-case text-ink-600">
              दिन बाकी
            </Hi>
          </span>
        )}
      </div>

      <p className="mt-3 text-xl font-bold text-ink-900">{rupees(coupon.valueRupees)} coupon</p>
      <Hi className="block text-brand-700">{rupees(coupon.valueRupees)} का कूपन</Hi>

      {/*
        The code is the whole product. Monospace so 8 and B cannot be confused
        when it is read down a phone line, wrap-anywhere so 19 characters can
        never push a 360px screen sideways, and select-all so one tap grabs it
        when the clipboard API is unavailable.
      */}
      <div className="mt-3">
        <p className="type-label text-ink-500">
          Coupon code
          <Hi inline className="ml-1.5 tracking-normal normal-case text-ink-600">
            कूपन कोड
          </Hi>
        </p>
        {/*
          Sized to the narrowest real screen first. 19 monospace characters at
          18px with this tracking measure ~226px, which clears the ~248px a
          360px phone leaves inside this card even when it is nested in the
          just-issued panel — so the code never wraps mid-group on the phone
          the member is most likely holding. `wrap-anywhere` is the backstop if
          a font ever measures wider; it must wrap rather than push the page
          sideways.
        */}
        <p
          className={cn(
            "mt-1.5 select-all rounded-xl bg-ink-50 px-2 py-3 text-center font-mono font-bold tracking-[0.06em] wrap-anywhere sm:px-3",
            active ? "text-ink-900" : "text-ink-600",
            highlight ? "text-lg sm:text-3xl" : "text-lg sm:text-2xl",
          )}
        >
          {coupon.code}
        </p>

        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? "Coupon code copied" : `Copy coupon code ${coupon.code}`}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink-300 px-5 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-400 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied ? "Copied" : "Copy code"}
          <Hi inline>{copied ? "कॉपी हो गया" : "कोड कॉपी करें"}</Hi>
        </button>
      </div>

      <div className="mt-3 text-sm text-ink-600">
        <p>
          Made on {issued} from {points} points.
        </p>
        <Hi className="block text-ink-600">
          {issued} को {points} पॉइंट्स से बना।
        </Hi>

        {active && (
          <>
            <p className="mt-1.5 font-semibold text-ink-800">Valid until {expires}.</p>
            <Hi className="block text-ink-700">{expires} तक चलेगा।</Hi>
            {/* The forfeit, restated on the coupon itself — a member who scrolls
                straight to their list must meet the same warning as one who
                just read the confirmation step. */}
            <p className="mt-1.5 text-brand-700">
              If it is not used by then it expires, and the {points} points are not returned.
            </p>
            <Hi className="block text-brand-700">
              अगर तब तक इस्तेमाल नहीं हुआ तो कूपन खत्म हो जाएगा, और {points} पॉइंट्स वापस नहीं
              मिलेंगे।
            </Hi>
          </>
        )}

        {coupon.status === CouponStatus.REDEEMED && (
          <>
            <p className="mt-1.5 font-semibold text-ink-800">
              Used{coupon.redeemedAt ? ` on ${formatDate(coupon.redeemedAt)}` : ""}.
            </p>
            <Hi className="block text-ink-700">
              {coupon.redeemedAt ? `${formatDate(coupon.redeemedAt)} को इस्तेमाल हुआ।` : "इस्तेमाल हो चुका है।"}
            </Hi>
            {coupon.externalRef && (
              <p className="mt-1 wrap-anywhere text-ink-500">
                Order reference
                <Hi inline className="ml-1.5 text-ink-600">
                  ऑर्डर नंबर
                </Hi>
                : {coupon.externalRef}
              </p>
            )}
          </>
        )}

        {coupon.status === CouponStatus.EXPIRED && (
          <>
            <p className="mt-1.5 font-semibold text-ink-800">
              Expired on {expires} without being used.
            </p>
            <Hi className="block text-ink-700">{expires} को बिना इस्तेमाल के खत्म हो गया।</Hi>
            <p className="mt-1">The {points} points spent on it were not returned.</p>
            <Hi className="block text-ink-600">इस पर लगे {points} पॉइंट्स वापस नहीं मिले।</Hi>
          </>
        )}
      </div>
    </div>
  );
}
