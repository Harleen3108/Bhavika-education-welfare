"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { revealDonationPanAction } from "@/server/actions/donations";
import { DonationStatus, DonationKind, DonationSource } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  userId: string | null;
  receiptNo: string | null;
  kind: string;
  status: string;
  source: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  anonymous: boolean;
  amount: number;
  categoryName: string;
  message: string;
  panLast4: string | null;
  paidAt: string | null;
  createdAt: string;
};

function statusTone(s: string): "success" | "warning" | "danger" | "neutral" {
  if (s === DonationStatus.PAID) return "success";
  if (s === DonationStatus.CREATED) return "warning";
  if (s === DonationStatus.FAILED) return "danger";
  return "neutral";
}

export function DonationsAdminTable({ items }: { items: Row[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No donations match"
        description="Online donations appear here once paid; you can also record offline ones."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((d) => (
        <li key={d.id}>
          <DonationRow row={d} />
        </li>
      ))}
    </ul>
  );
}

function DonationRow({ row }: { row: Row }) {
  const [pan, setPan] = React.useState<string | null>(null);
  const [revealing, setRevealing] = React.useState(false);
  const volunteer = row.kind === DonationKind.VOLUNTEER;
  const paid = row.status === DonationStatus.PAID;

  const reveal = async () => {
    setRevealing(true);
    try {
      const res = await revealDonationPanAction({ donationId: row.id });
      if (!res.ok) return toast.error(res.error);
      setPan(res.data?.pan || "—");
    } finally {
      setRevealing(false);
    }
  };

  return (
    <Card>
      <CardBody className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-900">
              {volunteer ? "Volunteer" : `₹${row.amount.toLocaleString("en-IN")}`}
            </span>
            <Badge tone="accent">{row.categoryName}</Badge>
            <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            <Badge tone="neutral">{row.source === DonationSource.MANUAL ? "Manual" : "Online"}</Badge>
            {row.anonymous && <Badge tone="neutral">Guptdan</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-700">
            {row.userId ? (
              <Link href={`/admin/users/${row.userId}`} className="font-medium text-brand-700 hover:underline">
                {row.donorName}
              </Link>
            ) : (
              <span className="font-medium">{row.donorName}</span>
            )}{" "}
            <span className="text-ink-500">· {row.donorEmail}</span>
            {row.donorPhone && <span className="text-ink-500"> · {row.donorPhone}</span>}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">
            {row.receiptNo ?? "— no receipt —"} · {formatDate(row.paidAt ?? row.createdAt)}
            {row.panLast4 && ` · PAN ${pan ?? `••••${row.panLast4}`}`}
          </p>
          {row.message && <p className="mt-1 text-sm text-ink-600">“{row.message}”</p>}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.panLast4 && !pan && (
            <Button size="sm" variant="subtle" onClick={reveal} loading={revealing}>
              <Eye size={14} /> PAN
            </Button>
          )}
          {paid && (
            <a
              href={`/api/donations/${row.id}/receipt`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink-300 px-3 text-sm font-medium text-ink-700 hover:border-brand-400 hover:text-brand-700"
            >
              <Download size={14} /> {volunteer ? "Certificate" : "Receipt"}
            </a>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
