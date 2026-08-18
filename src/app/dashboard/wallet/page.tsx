import type { Metadata } from "next";
import Link from "next/link";
import { Wallet as WalletIcon, Trophy, Gift, Sparkles, ReceiptText } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getWallet, listTransactions } from "@/server/services/wallet.service";
import { PointSource } from "@/lib/enums";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TransactionList } from "@/components/wallet/TransactionList";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wallet", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Quiz", value: PointSource.QUIZ },
  { label: "Referral", value: PointSource.REFERRAL },
  { label: "Activity", value: PointSource.ACTIVITY },
] as const;

const VALID_SOURCES = new Set<string>([
  PointSource.QUIZ,
  PointSource.REFERRAL,
  PointSource.ACTIVITY,
]);

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionUser();

  const page = Math.max(1, Number(sp.page) || 1);
  const source =
    sp.source && VALID_SOURCES.has(sp.source) ? (sp.source as PointSource) : undefined;

  const [wallet, txns] = await Promise.all([
    getWallet(session!.id),
    listTransactions(session!.id, { page, source }),
  ]);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/dashboard/wallet${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Wallet" description="Your points and complete transaction history." />

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total points" value={wallet.total} icon={<WalletIcon size={22} />} tone="brand" />
        <StatCard label="Quiz points" value={wallet.quiz} icon={<Trophy size={22} />} tone="accent" />
        <StatCard label="Referral points" value={wallet.referral} icon={<Gift size={22} />} tone="brand" />
        <StatCard label="Activity points" value={wallet.activity} icon={<Sparkles size={22} />} tone="neutral" />
      </div>

      {/* Ledger */}
      <Card className="mt-6">
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Transaction history</h2>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const active = (source ?? "") === f.value;
                const href = f.value
                  ? `/dashboard/wallet?source=${f.value}`
                  : "/dashboard/wallet";
                return (
                  <Link
                    key={f.label}
                    href={href}
                    className={cn(
                      // 32px pills are below the 44px touch minimum on a phone.
                      "inline-flex min-h-11 items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:min-h-0",
                      active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200",
                    )}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {txns.items.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={<ReceiptText size={36} />}
              title="No transactions yet"
              description="Take a quiz, complete your profile or invite a friend to start earning points."
            />
          ) : (
            <>
              <TransactionList transactions={txns.items} />
              <Pagination page={txns.page} pages={txns.pages} buildHref={buildHref} />
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}
