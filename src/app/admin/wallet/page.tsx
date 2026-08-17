import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { adminListTransactions } from "@/server/services/admin-read.service";
import { PointSource } from "@/lib/enums";
import { formatDateTime } from "@/lib/utils";
import { sourceTone, sourceLabel, signedPoints } from "@/lib/points-format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wallet — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const SOURCES = ["", ...Object.values(PointSource)];

export default async function AdminWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await adminListTransactions({ source: sp.source, page });

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sp.source) params.set("source", sp.source);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/wallet${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Wallet monitoring" description="All point transactions across the platform." />

      <div className="mb-4 flex flex-wrap gap-2">
        {SOURCES.map((s) => {
          const active = (sp.source ?? "") === s;
          return (
            <Link
              key={s || "all"}
              href={s ? `/admin/wallet?source=${s}` : "/admin/wallet"}
              className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200")}
            >
              {s ? sourceLabel(s) : "All"}
            </Link>
          );
        })}
      </div>

      {data.items.length === 0 ? (
        <EmptyState title="No transactions" description="Point transactions will appear here." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-ink-500">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Points</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((t) => {
                  const { text, positive } = signedPoints(t.points, t.type);
                  return (
                    <tr key={t.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-800">{t.user}</p>
                        <p className="text-xs text-ink-400">{t.email}</p>
                      </td>
                      <td className="px-4 py-3"><Badge tone={sourceTone(t.source)}>{sourceLabel(t.source)}</Badge></td>
                      <td className="px-4 py-3 text-ink-600">{t.description}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold", positive ? "text-success" : "text-danger")}>{text}</td>
                      <td className="px-4 py-3 text-right text-ink-600">{t.balanceAfter}</td>
                      <td className="px-4 py-3 text-xs text-ink-400">{formatDateTime(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Pagination page={data.page} pages={data.pages} buildHref={buildHref} />
    </>
  );
}
