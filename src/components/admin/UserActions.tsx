"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Coins,
  Lock,
  MailCheck,
  PauseCircle,
  TicketPlus,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/States";
import { WalletAdjustForm, type AdjustMember } from "@/components/admin/WalletAdjustForm";
import { IssueCouponForm } from "@/components/admin/IssueCouponForm";
import { setUserStatus, setUserRedemption, verifyUserEmail } from "@/server/actions/users";
import { AccountStatus } from "@/lib/enums";

type Status = (typeof AccountStatus)[keyof typeof AccountStatus];

const STATUS_COPY: Record<string, { verb: string; consequence: string; danger?: boolean }> = {
  [AccountStatus.ACTIVE]: {
    verb: "Activate",
    consequence: "They regain full access to quizzes, referrals and their wallet.",
  },
  [AccountStatus.SUSPENDED]: {
    verb: "Suspend",
    consequence: "They keep their points but cannot sign in until you activate them again.",
  },
  [AccountStatus.BLOCKED]: {
    verb: "Block",
    consequence: "They lose access permanently. Their ledger and referrals are kept intact.",
    danger: true,
  },
};

export function UserActions({
  userId,
  status,
  emailVerified,
  redemptionBlocked,
  member,
}: {
  userId: string;
  status: string;
  emailVerified: boolean;
  redemptionBlocked: boolean;
  member: AdjustMember;
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = React.useState<Status | null>(null);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [issueOpen, setIssueOpen] = React.useState(false);
  const [redemptionOpen, setRedemptionOpen] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  /*
    For a member who cannot receive our mail at all and would otherwise sit at
    PENDING forever. Goes through the same path as a real verification, so the
    referrer who invited them is still paid.
  */
  const verify = async () => {
    setVerifying(true);
    try {
      const res = await verifyUserEmail(userId);
      if (res.ok) {
        toast.success("Email marked verified. The member can sign in now.");
        router.refresh();
      } else {
        toast.error(res.error || "Could not verify this member.");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!emailVerified && (
        <Button size="sm" variant="secondary" onClick={verify} loading={verifying}>
          <MailCheck size={16} /> Mark email verified
        </Button>
      )}
      {status !== AccountStatus.ACTIVE && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setPendingStatus(AccountStatus.ACTIVE)}
        >
          <CheckCircle2 size={16} /> Activate
        </Button>
      )}
      {status !== AccountStatus.SUSPENDED && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPendingStatus(AccountStatus.SUSPENDED)}
        >
          <PauseCircle size={16} /> Suspend
        </Button>
      )}
      {status !== AccountStatus.BLOCKED && (
        <Button size="sm" variant="danger" onClick={() => setPendingStatus(AccountStatus.BLOCKED)}>
          <Ban size={16} /> Block
        </Button>
      )}
      <Button size="sm" variant="subtle" onClick={() => setAdjustOpen(true)}>
        <Coins size={16} /> Adjust points
      </Button>
      <Button size="sm" variant="subtle" onClick={() => setIssueOpen(true)}>
        <TicketPlus size={16} /> Issue coupon
      </Button>
      <Button
        size="sm"
        variant={redemptionBlocked ? "secondary" : "outline"}
        onClick={() => setRedemptionOpen(true)}
      >
        {redemptionBlocked ? <Unlock size={16} /> : <Lock size={16} />}
        {redemptionBlocked ? "Allow redemption" : "Block redemption"}
      </Button>

      <StatusModal
        userId={userId}
        next={pendingStatus}
        onClose={() => setPendingStatus(null)}
        onDone={() => router.refresh()}
      />

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title={`Adjust ${member.name}'s points`}
      >
        <WalletAdjustForm member={member} />
      </Modal>

      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title={`Issue a coupon to ${member.name}`}
      >
        <IssueCouponForm member={member} onIssued={() => setIssueOpen(false)} />
      </Modal>

      <RedemptionModal
        userId={userId}
        memberName={member.name}
        blocked={redemptionBlocked}
        open={redemptionOpen}
        onClose={() => setRedemptionOpen(false)}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

/**
 * Turn one member's coupon generation on or off. Blocking is the fraud lever;
 * it sits on top of the global switch and never loosens it.
 */
function RedemptionModal({
  userId,
  memberName,
  blocked,
  open,
  onClose,
  onDone,
}: {
  userId: string;
  memberName: string;
  blocked: boolean;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const willBlock = !blocked;

  const close = () => {
    if (busy) return;
    setReason("");
    onClose();
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await setUserRedemption({ userId, blocked: willBlock, reason: reason.trim() });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        willBlock ? "Redemption blocked for this member." : "Redemption allowed for this member.",
      );
      setReason("");
      onClose();
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={willBlock ? "Block coupon generation" : "Allow coupon generation"}
    >
      <div className="space-y-4">
        <Alert tone={willBlock ? "danger" : "info"}>
          {willBlock
            ? `${memberName} will not be able to turn points into coupons, even while redemption is enabled site-wide. Their points and existing coupons are untouched.`
            : `${memberName} will be able to generate coupons again, subject to the global redemption switch.`}
        </Alert>
        <div>
          <Label htmlFor="redemption-reason">Reason</Label>
          <Textarea
            id="redemption-reason"
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
            variant={willBlock ? "danger" : "primary"}
            onClick={confirm}
            loading={busy}
            type="button"
          >
            {willBlock ? "Block redemption" : "Allow redemption"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Status changes used to go through `window.prompt`, which several browsers now
 * suppress outright — the admin would see nothing happen and click again. A real
 * dialog also lets the consequence be stated before the decision is made, and
 * keeps the reason (which lands in the audit log) an optional field rather than
 * something the admin has to cancel out of.
 */
function StatusModal({
  userId,
  next,
  onClose,
  onDone,
}: {
  userId: string;
  next: Status | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const copy = next ? STATUS_COPY[next] : null;

  const close = () => {
    setReason("");
    onClose();
  };

  const confirm = async () => {
    if (!next || busy) return;
    setBusy(true);
    try {
      const res = await setUserStatus({ userId, status: next, reason: reason.trim() });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Account set to ${next.toLowerCase()}.`);
      setReason("");
      onClose();
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(next)} onClose={close} title={copy ? `${copy.verb} this account` : ""}>
      <div className="space-y-4">
        {copy && (
          <Alert tone={copy.danger ? "danger" : "info"}>{copy.consequence}</Alert>
        )}
        <div>
          <Label htmlFor="status-reason">Reason</Label>
          <Textarea
            id="status-reason"
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
  );
}
