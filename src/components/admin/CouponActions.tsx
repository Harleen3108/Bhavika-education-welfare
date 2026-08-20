"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw, CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/States";
import { couponAction } from "@/server/actions/coupons";
import { CouponStatus } from "@/lib/enums";
import { formatPoints } from "@/lib/utils";

type Action = "void" | "reactivate" | "expire";

export type CouponActionTarget = {
  id: string;
  code: string;
  status: string;
  pointsSpent: number;
};

const COPY: Record<
  Action,
  { verb: string; title: string; danger: boolean; consequence: (pts: number) => string }
> = {
  void: {
    verb: "Deactivate",
    title: "Deactivate this coupon",
    danger: true,
    consequence: (pts) =>
      pts > 0
        ? `The store will refuse it immediately, and the ${formatPoints(pts)} points spent on it are refunded to the member. You can reactivate it later.`
        : "The store will refuse it immediately. This was an admin-granted coupon, so no points are refunded. You can reactivate it later.",
  },
  expire: {
    verb: "Expire now",
    title: "Force this coupon to expire",
    danger: true,
    consequence: (pts) =>
      pts > 0
        ? `It ends now and cannot be redeemed. The ${formatPoints(pts)} points spent on it are refunded — unlike a coupon that simply lapses.`
        : "It ends now and cannot be redeemed. This was an admin-granted coupon, so no points are refunded.",
  },
  reactivate: {
    verb: "Reactivate",
    title: "Reactivate this coupon",
    danger: false,
    consequence: (pts) =>
      pts > 0
        ? `It becomes usable again. If its ${formatPoints(pts)} points were refunded when it was deactivated, they are debited from the member again — this fails if they have since spent them.`
        : "It becomes usable again at the store.",
  },
};

/**
 * Per-coupon admin actions.
 *
 * Which actions exist follows the coupon's state: a live coupon can be
 * deactivated or force-expired; a deactivated one can be reactivated; a
 * redeemed or lapsed coupon is settled and offers none. The consequence —
 * including whether points move — is stated before the click, because every one
 * of these touches a member's balance.
 */
export function CouponActions({ coupon }: { coupon: CouponActionTarget }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<Action | null>(null);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const open = (action: Action) => {
    setReason("");
    setPending(action);
  };
  const close = () => {
    if (busy) return;
    setPending(null);
    setReason("");
  };

  const confirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const res = await couponAction({ couponId: coupon.id, action: pending, reason: reason.trim() });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        pending === "reactivate"
          ? `Coupon ${coupon.code} reactivated.`
          : pending === "expire"
            ? `Coupon ${coupon.code} expired.`
            : `Coupon ${coupon.code} deactivated.`,
      );
      setPending(null);
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const isActive = coupon.status === CouponStatus.ACTIVE;
  const isVoid = coupon.status === CouponStatus.VOID;
  const copy = pending ? COPY[pending] : null;

  if (!isActive && !isVoid) {
    return <span className="text-xs text-ink-400">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {isActive && (
        <>
          <Button size="sm" variant="outline" onClick={() => open("void")}>
            <Ban size={14} /> Deactivate
          </Button>
          <Button size="sm" variant="subtle" onClick={() => open("expire")}>
            <CalendarX2 size={14} /> Expire
          </Button>
        </>
      )}
      {isVoid && (
        <Button size="sm" variant="secondary" onClick={() => open("reactivate")}>
          <RotateCcw size={14} /> Reactivate
        </Button>
      )}

      <Modal open={Boolean(pending)} onClose={close} title={copy?.title ?? ""}>
        <div className="space-y-4">
          <p className="font-mono text-sm font-semibold text-ink-900">{coupon.code}</p>
          {copy && (
            <Alert tone={copy.danger ? "danger" : "info"}>
              {copy.consequence(coupon.pointsSpent)}
            </Alert>
          )}
          <div>
            <Label htmlFor="coupon-action-reason">Reason</Label>
            <Textarea
              id="coupon-action-reason"
              value={reason}
              maxLength={300}
              placeholder="Optional — recorded in the admin audit log."
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="subtle" onClick={close} type="button">
              Cancel
            </Button>
            <Button
              variant={copy?.danger ? "danger" : "primary"}
              onClick={confirm}
              loading={busy}
              type="button"
            >
              {copy?.verb ?? "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
