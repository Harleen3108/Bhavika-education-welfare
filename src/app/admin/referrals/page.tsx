import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { adminListReferrals } from "@/server/services/admin-read.service";
import { ReferralStatus } from "@/lib/enums";
import { formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Referrals — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUSES = ["", ...Object.values(ReferralStatus)];

function tone(s: string) {
  return s === ReferralStatus.REWARDED ? "success" : s === ReferralStatus.REJECTED ? "danger" : s === ReferralStatus.QUALIFIED ? "brand" : "warning";
}

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await adminListReferrals({ status: sp.status, page });

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sp.status) params.set("status", sp.status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/referrals${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Referrals" description="Monitor and investigate referrals." />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = (sp.status ?? "") === s;
          return (
            <Link
              key={s || "all"}
              href={s ? `/admin/referrals?status=${s}` : "/admin/referrals"}
              className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200")}
            >
              {s || "All"}
            </Link>
          );
        })}
      </div>

      {data.items.length === 0 ? (
        <EmptyState title="No referrals" description="Referrals will appear here as users invite friends." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-ink-500">
                  <th className="px-4 py-3 font-medium">Referrer</th>
                  <th className="px-4 py-3 font-medium">Referred</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Reward</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3 font-medium text-ink-800">{r.referrer}</td>
                    <td className="px-4 py-3 text-ink-700">{r.referred}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">{r.code}</td>
                    <td className="px-4 py-3"><Badge tone={tone(r.status)}>{r.status}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-700">{r.status === ReferralStatus.REWARDED ? `+${r.rewardPoints}` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-ink-400">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Pagination page={data.page} pages={data.pages} buildHref={buildHref} />
    </>
  );
}
