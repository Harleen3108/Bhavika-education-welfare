import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarX2,
  Download,
  IndianRupee,
  SlidersHorizontal,
  Ticket,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { CouponsTable } from "@/components/admin/CouponsTable";
import { adminListCoupons } from "@/server/services/admin-read.service";
import { getCouponPolicy } from "@/server/services/coupon.service";
import { CouponStatus } from "@/lib/enums";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Coupons — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUSES = Object.values(CouponStatus) as string[];

const STATUS_LABELS: Record<string, string> = {
  [CouponStatus.ACTIVE]: "Active — still usable",
  [CouponStatus.REDEEMED]: "Redeemed — spent at the store",
  [CouponStatus.EXPIRED]: "Expired — points forfeited",
};

type Search = { q?: string; status?: string; page?: string };

const rupees = (n: number) => `₹${formatPoints(n)}`;

export default async function AdminCouponsPage({
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

  const [data, policy] = await Promise.all([adminListCoupons(filters), getCouponPolicy()]);
  const { totals } = data;
  const filtered = Boolean(filters.q || filters.status);

  const query = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params.toString();
  };

  const buildHref = (p: number) => {
    const qs = query(p > 1 ? { page: String(p) } : {});
    return `/admin/coupons${qs ? `?${qs}` : ""}`;
  };

  const exportHref = `/api/admin/coupons?${query({ format: "csv" })}`;

  const from = (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.page * data.pageSize, data.total);

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Every coupon issued against members' points — what is still owed, what has been spent, and what lapsed."
      />

      {!policy.enabled ? (
        <Alert tone="warning" className="mb-6" title="Coupon issuing is switched off">
          Members cannot generate coupons while{" "}
          <Link href="/admin/settings" className="font-semibold underline">
            redemption is disabled in settings
          </Link>
          . Turn it on only once Jai Maa Durga can accept a coupon code — a coupon a shop will not
          honour still costs the member their points.
        </Alert>
      ) : (
        <Alert tone="info" className="mb-6">
          Members can generate coupons now. Each one is valid{" "}
          <strong>{formatPoints(policy.validityDays)} days</strong> and its points are debited the
          moment it is created — an unused coupon expires and those points are not returned.{" "}
          <Link href="/admin/settings" className="font-semibold underline">
            Change the validity window
          </Link>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Outstanding liability"
          value={rupees(totals.activeRupees)}
          icon={<IndianRupee size={22} />}
          tone="brand"
          isPoints={false}
        />
        <StatCard
          label="Active coupons"
          value={totals.activeCount}
          icon={<Ticket size={22} />}
          tone="accent"
          isPoints={false}
        />
        <StatCard
          label="Redeemed"
          value={totals.redeemedCount}
          icon={<BadgeCheck size={22} />}
          tone="neutral"
          isPoints={false}
        />
        <StatCard
          label="Expired unused"
          value={totals.expiredCount}
          icon={<CalendarX2 size={22} />}
          tone="neutral"
          isPoints={false}
        />
      </div>

      {/*
        The tiles are counts and one rupee figure; this says what the rupee
        figure MEANS. Outstanding liability is the number the foundation settles
        against, and an admin should never have to reconstruct it from a table.
      */}
      <Card className="mt-4">
        <CardBody className="p-4 sm:p-5">
          <p className="text-sm text-ink-700">
            <strong className="text-ink-900">Outstanding liability {rupees(totals.activeRupees)}</strong>{" "}
            is the face value of the {formatPoints(totals.activeCount)} coupon
            {totals.activeCount === 1 ? "" : "s"} that are still usable today — money Jai Maa Durga
            can still present for settlement. Members have already paid{" "}
            {formatPoints(totals.activePoints)} points for it.
          </p>
          <p className="mt-2 text-sm text-ink-600">
            {rupees(totals.redeemedRupees)} across {formatPoints(totals.redeemedCount)} coupon
            {totals.redeemedCount === 1 ? "" : "s"} has already been spent and settled.{" "}
            {rupees(totals.expiredRupees)} across {formatPoints(totals.expiredCount)} coupon
            {totals.expiredCount === 1 ? "" : "s"} expired unused — the{" "}
            {formatPoints(totals.forfeitedPoints)} points behind it were forfeited and are never
            owed again. Neither counts towards the liability.
          </p>
          {filtered && (
            <p className="mt-2 text-xs text-ink-500">
              {filters.q
                ? "These totals cover every coupon matching your search, in all three states — the status filter narrows the table below, not the figures above."
                : "These totals cover every coupon on the platform — the status filter narrows the table below, not the figures above."}
            </p>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-ink-500" />
            <h2 className="text-base font-semibold text-ink-900">Find a coupon</h2>
          </div>

          <form method="get" className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="f-q">Search</Label>
              <Input
                id="f-q"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Coupon code, store order ref, member name or email"
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
                  href="/admin/coupons"
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-ink-600 hover:text-brand-700"
                >
                  Clear all
                </Link>
              )}
              <a
                href={exportHref}
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-300 px-4 text-sm font-medium text-ink-700 hover:border-brand-400 hover:text-brand-700"
              >
                <Download size={16} /> Export CSV
              </a>
            </div>
          </form>
        </CardBody>
      </Card>

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink-900">Issued coupons</h2>
          <p className="text-sm text-ink-500">
            {data.total === 0
              ? "No coupons"
              : `Showing ${formatPoints(from)}–${formatPoints(to)} of ${formatPoints(data.total)}`}
          </p>
        </div>

        <CouponsTable items={data.items} filtered={filtered} />

        <Pagination page={data.page} pages={data.pages} buildHref={buildHref} />
      </section>
    </>
  );
}
