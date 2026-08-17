"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { setUserStatus } from "@/server/actions/users";
import { adjustPoints } from "@/server/actions/wallet";
import { AccountStatus } from "@/lib/enums";

export function UserActions({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);

  const changeStatus = async (next: string) => {
    const reason = window.prompt(`Reason for setting status to ${next}? (optional)`) ?? "";
    setBusy(true);
    try {
      const res = await setUserStatus({ userId, status: next, reason });
      if (!res.ok) return toast.error(res.error);
      toast.success(`User set to ${next}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status !== AccountStatus.ACTIVE && (
        <Button size="sm" variant="secondary" loading={busy} onClick={() => changeStatus(AccountStatus.ACTIVE)}>Activate</Button>
      )}
      {status !== AccountStatus.SUSPENDED && (
        <Button size="sm" variant="outline" loading={busy} onClick={() => changeStatus(AccountStatus.SUSPENDED)}>Suspend</Button>
      )}
      {status !== AccountStatus.BLOCKED && (
        <Button size="sm" variant="danger" loading={busy} onClick={() => changeStatus(AccountStatus.BLOCKED)}>Block</Button>
      )}
      <Button size="sm" variant="subtle" onClick={() => setAdjustOpen(true)}>Adjust points</Button>

      <AdjustModal open={adjustOpen} onClose={() => setAdjustOpen(false)} userId={userId} onDone={() => router.refresh()} />
    </div>
  );
}

function AdjustModal({
  open,
  onClose,
  userId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onDone: () => void;
}) {
  const [points, setPoints] = React.useState(0);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await adjustPoints({ userId, points, reason });
      if (!res.ok) return toast.error(res.error);
      toast.success("Adjustment applied and recorded.");
      onClose();
      setPoints(0);
      setReason("");
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manual point adjustment">
      <div className="space-y-4">
        <p className="text-sm text-ink-500">
          Positive to credit, negative to debit. This creates an audited ledger transaction — balances are never edited silently.
        </p>
        <div>
          <Label required>Points (+/-)</Label>
          <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
        </div>
        <div>
          <Label required>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Event participation bonus" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!points || reason.trim().length < 3}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
}
