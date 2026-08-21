"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, Eye, Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Textarea, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { idCardAction, revealIdCardPii } from "@/server/actions/idcards";
import { IdCardStatus } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  userId: string;
  member: string;
  email: string;
  status: string;
  memberId: string | null;
  fatherName: string;
  city: string;
  photoUrl: string;
  aadhaarMasked: string;
  panMasked: string;
  issuedByAdmin: boolean;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

function statusTone(s: string): "warning" | "success" | "danger" | "neutral" {
  if (s === IdCardStatus.PENDING) return "warning";
  if (s === IdCardStatus.APPROVED) return "success";
  if (s === IdCardStatus.REJECTED) return "danger";
  return "neutral";
}

export function IdCardAdminTable({ items }: { items: Row[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck size={36} />}
        title="No ID card requests"
        description="Requests members submit appear here for review, and cards you issue are listed too."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id}>
          <RequestCard row={r} />
        </li>
      ))}
    </ul>
  );
}

function RequestCard({ row }: { row: Row }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | "approve" | "reject">(null);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [revealed, setRevealed] = React.useState<{ aadhaar: string; pan: string } | null>(null);
  const [revealing, setRevealing] = React.useState(false);

  const pending = row.status === IdCardStatus.PENDING;
  const approved = row.status === IdCardStatus.APPROVED;

  const doAction = async (action: "approve" | "reject", why = "") => {
    setBusy(action);
    try {
      const res = await idCardAction({ cardId: row.id, action, reason: why });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(action === "approve" ? "ID card approved." : "Request rejected.");
      setRejectOpen(false);
      setReason("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const reveal = async () => {
    setRevealing(true);
    try {
      const res = await revealIdCardPii({ cardId: row.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setRevealed(res.data ?? null);
    } finally {
      setRevealing(false);
    }
  };

  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={row.photoUrl} name={row.member} size={48} />
            <div className="min-w-0">
              {row.userId ? (
                <Link
                  href={`/admin/users/${row.userId}`}
                  className="truncate font-semibold text-brand-700 hover:underline"
                >
                  {row.member}
                </Link>
              ) : (
                <p className="truncate font-semibold text-ink-800">{row.member}</p>
              )}
              <p className="truncate text-xs text-ink-500">{row.email}</p>
              {row.memberId && (
                <p className="mt-0.5 font-mono text-xs text-ink-600">{row.memberId}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            {row.issuedByAdmin && <span className="text-[11px] text-ink-400">admin-issued</span>}
          </div>
        </div>

        <dl className="mt-3 grid gap-x-4 gap-y-2 border-t border-ink-100 pt-3 text-sm sm:grid-cols-2">
          <Cell label="Father's name">{row.fatherName}</Cell>
          <Cell label="City">{row.city || "—"}</Cell>
          <Cell label="Aadhaar">
            <span className="font-mono">{revealed ? revealed.aadhaar : row.aadhaarMasked}</span>
          </Cell>
          <Cell label="PAN">
            <span className="font-mono">{revealed ? revealed.pan : row.panMasked}</span>
          </Cell>
          <Cell label="Submitted">{formatDate(row.createdAt)}</Cell>
          {row.rejectionReason && (
            <Cell label="Rejection reason" className="sm:col-span-2">
              {row.rejectionReason}
            </Cell>
          )}
        </dl>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
          {pending && (
            <>
              <Button
                size="sm"
                onClick={() => doAction("approve")}
                loading={busy === "approve"}
                disabled={busy !== null}
              >
                <Check size={14} /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={busy !== null}
              >
                <X size={14} /> Reject
              </Button>
            </>
          )}
          {!revealed && (
            <Button size="sm" variant="subtle" onClick={reveal} loading={revealing}>
              <Eye size={14} /> Reveal KYC
            </Button>
          )}
          {approved && (
            <a
              href={`/api/idcard/${row.id}/download`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink-300 px-3 text-sm font-medium text-ink-700 hover:border-brand-400 hover:text-brand-700"
            >
              <Download size={14} /> Download
            </a>
          )}
        </div>

        <Modal open={rejectOpen} onClose={() => !busy && setRejectOpen(false)} title="Reject this request">
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              The member sees this reason and can correct their details and resubmit.
            </p>
            <div>
              <Label htmlFor={`reject-${row.id}`}>Reason</Label>
              <Textarea
                id={`reject-${row.id}`}
                value={reason}
                maxLength={300}
                placeholder="e.g. The Aadhaar number doesn't match the name provided."
                onChange={(e) => setReason(e.target.value)}
                className="min-h-20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="subtle" onClick={() => setRejectOpen(false)} type="button">
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => doAction("reject", reason.trim())}
                loading={busy === "reject"}
                type="button"
              >
                Reject request
              </Button>
            </div>
          </div>
        </Modal>
      </CardBody>
    </Card>
  );
}

function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink-800">{children}</dd>
    </div>
  );
}
