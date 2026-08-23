import type { Metadata } from "next";
import Link from "next/link";
import { IndianRupee, HeartHandshake, Users, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { DonationsAdminTable } from "@/components/admin/DonationsAdminTable";
import { RecordDonationButton } from "@/components/admin/RecordDonationButton";
import { CausesManager } from "@/components/admin/CausesManager";
import { adminListDonations, adminListCategories } from "@/server/services/donation.service";
import { DonationStatus, DonationKind } from "@/lib/enums";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Donations — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUSES = Object.values(DonationStatus) as string[];
const KINDS = Object.values(DonationKind) as string[];

type Search = { q?: string; status?: string; kind?: string; page?: string };

export default async function AdminDonationsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const filters = {
    q: sp.q?.trim() || undefined,
    status: sp.status && STATUSES.includes(sp.status) ? sp.status : undefined,
    kind: sp.kind && KINDS.includes(sp.kind) ? sp.kind : undefined,
    page: Math.max(1, Number(sp.page) || 1),
  };

  const [data, causes] = await Promise.all([adminListDonations(filters), adminListCategories()]);
  const filtered = Boolean(filters.q || filters.status || filters.kind);
  const causeOptions = causes.map((c) => ({ id: c.id, name: c.name }));

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.kind) params.set("kind", filters.kind);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/donations${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Donations"
        description="Online and offline donations, volunteer certificates, and the causes donors can give to."
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total raised" value={`₹${formatPoints(data.totals.paidRupees)}`} icon={<IndianRupee size={22} />} tone="brand" isPoints={false} />
        <StatCard label="Donations" value={data.totals.paidCount} icon={<HeartHandshake size={22} />} tone="accent" isPoints={false} />
        <StatCard label="Donors" value={data.totals.donorCount} icon={<Users size={22} />} tone="neutral" isPoints={false} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-ink-500" />
                <h2 className="text-base font-semibold text-ink-900">Find a donation</h2>
              </div>
              <form method="get" className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <Label htmlFor="f-q">Search</Label>
                  <Input id="f-q" name="q" defaultValue={filters.q ?? ""} placeholder="Donor name, email or receipt no." />
                </div>
                <div>
                  <Label htmlFor="f-status">Status</Label>
                  <Select id="f-status" name="status" defaultValue={filters.status ?? ""}>
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="f-kind">Type</Label>
                  <Select id="f-kind" name="kind" defaultValue={filters.kind ?? ""}>
                    <option value="">All types</option>
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm">
                    Apply
                  </Button>
                  {filtered && (
                    <Link href="/admin/donations" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-ink-600 hover:text-brand-700">
                      Clear
                    </Link>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>

          <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink-900">
              {data.total === 0 ? "No donations" : `${formatPoints(data.total)} record${data.total === 1 ? "" : "s"}`}
            </h2>
            <RecordDonationButton causes={causeOptions} />
          </div>

          <DonationsAdminTable items={data.items} />
          <Pagination page={data.page} pages={data.pages} buildHref={buildHref} />
        </div>

        <div className="lg:col-span-1">
          <CausesManager causes={causes} />
        </div>
      </div>
    </>
  );
}
