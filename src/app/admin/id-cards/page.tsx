import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ShieldCheck, XCircle, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { IdCardAdminTable } from "@/components/admin/IdCardAdminTable";
import { IssueIdCardButton } from "@/components/admin/IssueIdCardButton";
import { adminListCards } from "@/server/services/idcard.service";
import { IdCardStatus } from "@/lib/enums";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "ID Cards — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUSES = Object.values(IdCardStatus) as string[];

const STATUS_LABELS: Record<string, string> = {
  [IdCardStatus.PENDING]: "Pending — awaiting review",
  [IdCardStatus.APPROVED]: "Approved — card issued",
  [IdCardStatus.REJECTED]: "Rejected — needs changes",
};

type Search = { q?: string; status?: string; page?: string };

export default async function AdminIdCardsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const filters = {
    q: sp.q?.trim() || undefined,
    status: sp.status && STATUSES.includes(sp.status) ? sp.status : undefined,
    page: Math.max(1, Number(sp.page) || 1),
  };

  const data = await adminListCards(filters);
  const filtered = Boolean(filters.q || filters.status);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/id-cards${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="ID cards"
        description="Review member KYC requests, approve or reject them, and issue cards on a member's behalf."
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Pending review"
          value={data.counts.pending}
          icon={<Clock size={22} />}
          tone="brand"
          isPoints={false}
        />
        <StatCard
          label="Approved"
          value={data.counts.approved}
          icon={<ShieldCheck size={22} />}
          tone="accent"
          isPoints={false}
        />
        <StatCard
          label="Rejected"
          value={data.counts.rejected}
          icon={<XCircle size={22} />}
          tone="neutral"
          isPoints={false}
        />
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-ink-500" />
            <h2 className="text-base font-semibold text-ink-900">Find a request</h2>
          </div>
          <form method="get" className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="f-q">Search</Label>
              <Input
                id="f-q"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Member ID, name or email"
              />
            </div>
            <div>
              <Label htmlFor="f-status">Status</Label>
              <Select id="f-status" name="status" defaultValue={filters.status ?? ""}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              {filtered && (
                <Link
                  href="/admin/id-cards"
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-ink-600 hover:text-brand-700"
                >
                  Clear all
                </Link>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink-900">Requests</h2>
            <p className="text-sm text-ink-500">
              {data.total === 0
                ? "No requests"
                : `${formatPoints(data.total)} total${data.counts.pending ? ` · ${formatPoints(data.counts.pending)} awaiting review` : ""}`}
            </p>
          </div>
          <IssueIdCardButton />
        </div>

        <IdCardAdminTable items={data.items} />

        <Pagination page={data.page} pages={data.pages} buildHref={buildHref} />
      </section>
    </>
  );
}
