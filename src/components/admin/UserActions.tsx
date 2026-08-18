"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Coins, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/States";
import { WalletAdjustForm, type AdjustMember } from "@/components/admin/WalletAdjustForm";
import { setUserStatus } from "@/server/actions/users";
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
  member,
}: {
  userId: string;
  status: string;
  member: AdjustMember;
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = React.useState<Status | null>(null);
  const [adjustOpen, setAdjustOpen] = React.useState(false);

  return (
    <div className="flex flex-wrap gap-2">
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
    </div>
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
