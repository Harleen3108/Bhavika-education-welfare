"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, TicketX } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { CouponStatus } from "@/lib/enums";
import { formatDate, formatPoints } from "@/lib/utils";

/*
  Declared locally rather than imported from admin-read.service: that module is
  `server-only`, and a client component may not pull it in. Structural typing
  means the service's rows still satisfy this, so a field that changes shape
  there is a compile error here.
*/
type Coupon = {
  id: string;
  code: string;
  userId: string;
  member: string;
  email: string;
  valueRupees: number;
  pointsSpent: number;
  /** Effective status — the service has already applied the clock. */
  status: string;
  issuedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  externalRef: string | null;
  daysRemaining: number;
};

const rupees = (n: number) => `₹${formatPoints(n)}`;

function statusTone(status: string): "accent" | "success" | "danger" | "neutral" {
  if (status === CouponStatus.ACTIVE) return "accent";
  if (status === CouponStatus.REDEEMED) return "success";
  if (status === CouponStatus.EXPIRED) return "danger";
  return "neutral";
}

/**
 * The one-line consequence of a coupon's status, in the terms an admin is asked
 * about on the phone: how long is left, when it was spent, or how many points
 * the member lost.
 */
function statusDetail(c: Coupon): string {
  if (c.status === CouponStatus.ACTIVE) {
    return c.daysRemaining === 1 ? "1 day left" : `${formatPoints(c.daysRemaining)} days left`;
  }
  if (c.status === CouponStatus.REDEEMED) {
    return c.redeemedAt ? `Used ${formatDate(c.redeemedAt)}` : "Used";
  }
  return `${formatPoints(c.pointsSpent)} points forfeited`;
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
    } catch {
      toast.error("Couldn't copy — select the code and copy it manually.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    // h-11 w-11: a 44px target. The visible glyph stays small, the hit area does not.
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-brand-50 hover:text-brand-700"
      aria-label={copied ? "Coupon code copied" : `Copy coupon code ${code}`}
    >
      {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
    </button>
  );
}

/** A coupon can outlive its member's account, so the link is conditional. */
function MemberLink({ id, name }: { id: string; name: string }) {
  if (!id) return <p className="font-medium text-ink-500">{name}</p>;
  return (
    <Link href={`/admin/users/${id}`} className="font-medium text-brand-700 hover:underline">
      {name}
    </Link>
  );
}

function CouponCard({ c }: { c: Coupon }) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* wrap-anywhere: a 19-character code has no break opportunity of its
              own and would push the card past 360px. */}
          <p className="min-w-0 font-mono text-sm font-semibold wrap-anywhere text-ink-900">
            {c.code}
          </p>
          <CopyCode code={c.code} />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(c.status)}>{c.status}</Badge>
          <span className="text-xs text-ink-500">{statusDetail(c)}</span>
        </div>

        <div className="mt-3 min-w-0">
          <MemberLink id={c.userId} name={c.member} />
          <p className="truncate text-xs text-ink-500">{c.email}</p>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-ink-100 pt-3">
          <span className="font-display text-lg font-bold text-ink-900">
            {rupees(c.valueRupees)}
          </span>
          <span className="text-xs text-ink-500">{formatPoints(c.pointsSpent)} points spent</span>
        </div>

        <dl className="mt-2 space-y-1 text-xs text-ink-500">
          <div className="flex justify-between gap-3">
            <dt>Issued</dt>
            <dd className="text-ink-700">{formatDate(c.issuedAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Expires</dt>
            <dd className="text-ink-700">{formatDate(c.expiresAt)}</dd>
          </div>
          {c.externalRef && (
            <div className="flex justify-between gap-3">
              <dt>Store ref</dt>
              <dd className="font-mono wrap-anywhere text-ink-700">{c.externalRef}</dd>
            </div>
          )}
        </dl>
      </CardBody>
    </Card>
  );
}

function CouponRow({ c }: { c: Coupon }) {
  return (
    <tr className="align-top hover:bg-ink-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-semibold whitespace-nowrap text-ink-900">
            {c.code}
          </span>
          <CopyCode code={c.code} />
        </div>
      </td>
      <td className="px-4 py-3">
        <MemberLink id={c.userId} name={c.member} />
        <p className="text-xs text-ink-400">{c.email}</p>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className="font-semibold text-ink-900">{rupees(c.valueRupees)}</span>
        <p className="text-xs text-ink-400">{formatPoints(c.pointsSpent)} pts</p>
      </td>
      <td className="px-4 py-3">
        <Badge tone={statusTone(c.status)}>{c.status}</Badge>
        <p className="mt-1 text-xs text-ink-500">{statusDetail(c)}</p>
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-500">{formatDate(c.issuedAt)}</td>
      <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-500">
        {formatDate(c.expiresAt)}
      </td>
      <td className="max-w-40 px-4 py-3 font-mono text-xs wrap-anywhere text-ink-600">
        {c.externalRef ?? <span className="font-sans text-ink-400">—</span>}
      </td>
    </tr>
  );
}

/**
 * The issued-coupon ledger.
 *
 * Below md every row becomes its own card: seven columns cannot be made to fit
 * 360px, and a horizontally scrolling table on a phone hides the very column
 * (status) an admin opened the page for.
 */
export function CouponsTable({ items, filtered }: { items: Coupon[]; filtered: boolean }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<TicketX size={36} />}
        title={filtered ? "No coupons match these filters" : "No coupons issued yet"}
        description={
          filtered
            ? "Clear the search or widen the status filter to see more."
            : "Every coupon a member generates from their points appears here the moment it is issued."
        }
        action={
          filtered ? (
            <Link href="/admin/coupons" className="text-sm font-semibold text-brand-700 hover:underline">
              Clear all filters
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden">
        {items.map((c) => (
          <li key={c.id}>
            <CouponCard c={c} />
          </li>
        ))}
      </ul>

      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500">
                <th className="px-4 py-3 font-medium">Coupon</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Store ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((c) => (
                <CouponRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
