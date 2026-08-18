import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  ReceiptText,
  Scale,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { Avatar } from "@/components/ui/Avatar";
import { WalletAdjustForm } from "@/components/admin/WalletAdjustForm";
import {
  adminListTransactions,
  adminGetMemberBrief,
} from "@/server/services/admin-read.service";
import { PointSource, TransactionType } from "@/lib/enums";
import { formatDateTime, formatPoints, cn } from "@/lib/utils";
import { sourceTone, sourceLabel, signedPoints } from "@/lib/points-format";

export const metadata: Metadata = { title: "Wallet — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const SOURCES = Object.values(PointSource) as string[];
const TYPES = Object.values(TransactionType) as string[];

type Search = {
  q?: string;
  userId?: string;
  source?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: string;
};

/** Only echo a filter back into the query if it is one we actually support. */
function oneOf(value: string | undefined, allowed: string[]): string | undefined {
  return value && allowed.includes(value) ? value : undefined;
}

function isoDay(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function signed(n: number): string {
  return `${n < 0 ? "−" : "+"}${formatPoints(Math.abs(n))}`;
}

export default async function AdminWalletPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;

  const filters = {
    q: sp.q?.trim() || undefined,
    userId: sp.userId?.trim() || undefined,
    source: oneOf(sp.source, SOURCES),
    type: oneOf(sp.type, TYPES),
    from: isoDay(sp.from),
    to: isoDay(sp.to),
    page: Math.max(1, Number(sp.page) || 1),
  };

  const [data, pinned] = await Promise.all([
    adminListTransactions(filters),
    filters.userId ? adminGetMemberBrief(filters.userId) : Promise.resolve(null),
  ]);

  const filtered = Boolean(
    filters.q || filters.userId || filters.source || filters.type || filters.from || filters.to,
  );

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (filters.userId) params.set("userId", filters.userId);
    else if (filters.q) params.set("q", filters.q);
    if (filters.source) params.set("source", filters.source);
    if (filters.type) params.set("type", filters.type);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/wallet${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Every point movement on the platform, and the only place a balance can be changed."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody>
            <CardTitle>Adjust points</CardTitle>
            <p className="mt-1 mb-5 text-sm text-ink-600">
              Credit or take back points. Every change is a ledger entry the member can see.
            </p>
            <WalletAdjustForm member={pinned} />
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              label="Entries"
              value={data.total}
              icon={<ReceiptText size={22} />}
              tone="neutral"
              isPoints={false}
            />
            <StatCard
              label="Credited"
              value={formatPoints(data.totals.credited)}
              icon={<ArrowUpRight size={22} />}
              tone="accent"
              isPoints={false}
            />
            <StatCard
              label="Debited"
              value={formatPoints(data.totals.debited)}
              icon={<ArrowDownRight size={22} />}
              tone="neutral"
              isPoints={false}
            />
            <StatCard
              label="Net"
              value={signed(data.totals.net)}
              icon={<Scale size={22} />}
              tone="brand"
              isPoints={false}
            />
          </div>

          <Card>
            <CardBody>
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-ink-500" />
                <h2 className="text-base font-semibold text-ink-900">Filter the ledger</h2>
              </div>

              {pinned && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <Avatar src={pinned.avatarUrl} name={pinned.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{pinned.name}</p>
                    <p className="truncate text-xs text-ink-600">
                      {pinned.email} · holds {formatPoints(pinned.balance)} points
                    </p>
                  </div>
                  <Link
                    href="/admin/wallet"
                    className="shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-white hover:text-danger"
                    aria-label="Clear the member filter"
                  >
                    <X size={18} />
                  </Link>
                </div>
              )}

              <form method="get" className="grid gap-3 sm:grid-cols-2">
                {pinned ? (
                  <input type="hidden" name="userId" value={pinned.id} />
                ) : (
                  <div className="sm:col-span-2">
                    <Label htmlFor="f-q">Member</Label>
                    <Input
                      id="f-q"
                      name="q"
                      defaultValue={filters.q ?? ""}
                      placeholder="Name, email or referral code"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="f-source">Source</Label>
                  <Select id="f-source" name="source" defaultValue={filters.source ?? ""}>
                    <option value="">All sources</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {sourceLabel(s)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="f-type">Type</Label>
                  <Select id="f-type" name="type" defaultValue={filters.type ?? ""}>
                    <option value="">All types</option>
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="f-from">From</Label>
                  <Input id="f-from" name="from" type="date" defaultValue={filters.from ?? ""} />
                </div>

                <div>
                  <Label htmlFor="f-to">To</Label>
                  <Input id="f-to" name="to" type="date" defaultValue={filters.to ?? ""} />
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <Button type="submit" size="sm">
                    Apply filters
                  </Button>
                  {filtered && (
                    <Link
                      href="/admin/wallet"
                      className="rounded-full px-4 py-2 text-sm font-medium text-ink-600 hover:text-brand-700"
                    >
                      Clear all
                    </Link>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink-900">Transaction history</h2>
          <p className="text-sm text-ink-500">
            {data.total === 0
              ? "No entries"
              : `Showing ${(data.page - 1) * data.pageSize + 1}–${Math.min(
                  data.page * data.pageSize,
                  data.total,
                )} of ${formatPoints(data.total)}`}
          </p>
        </div>

        {data.items.length === 0 ? (
          <EmptyState
            icon={<Coins size={36} />}
            title={filtered ? "Nothing matches these filters" : "No transactions yet"}
            description={
              filtered
                ? "Widen the date range or clear a filter to see more of the ledger."
                : "Points awarded by quizzes, referrals and adjustments all land here."
            }
            action={
              filtered ? (
                <Link
                  href="/admin/wallet"
                  className="text-sm font-semibold text-brand-700 hover:underline"
                >
                  Clear all filters
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Phone: one card per entry. A six-column ledger cannot fit 360px. */}
            <ul className="space-y-3 md:hidden">
              {data.items.map((t) => {
                const { text, positive } = signedPoints(t.points, t.type);
                return (
                  <li key={t.id}>
                    <Card>
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <MemberLink id={t.userId} name={t.user} />
                            <p className="truncate text-xs text-ink-500">{t.email}</p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 font-semibold",
                              positive ? "text-success" : "text-danger",
                            )}
                          >
                            {text}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-ink-700">{t.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                          <Badge tone={sourceTone(t.source)}>{sourceLabel(t.source)}</Badge>
                          <span className="text-xs text-ink-500">
                            Balance after {formatPoints(t.balanceAfter)}
                          </span>
                          <span className="ml-auto text-xs text-ink-400">
                            {formatDateTime(t.createdAt)}
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </li>
                );
              })}
            </ul>

            <Card className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-ink-500">
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 text-right font-medium">Points</th>
                      <th className="px-4 py-3 text-right font-medium">Balance after</th>
                      <th className="px-4 py-3 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {data.items.map((t) => {
                      const { text, positive } = signedPoints(t.points, t.type);
                      return (
                        <tr key={t.id} className="align-top hover:bg-ink-50/50">
                          <td className="px-4 py-3">
                            <MemberLink id={t.userId} name={t.user} />
                            <p className="text-xs text-ink-400">{t.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={sourceTone(t.source)}>{sourceLabel(t.source)}</Badge>
                          </td>
                          <td className="max-w-xs px-4 py-3 text-ink-600">{t.description}</td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-semibold whitespace-nowrap",
                              positive ? "text-success" : "text-danger",
                            )}
                          >
                            {text}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-ink-600">
                            {formatPoints(t.balanceAfter)}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-400">
                            {formatDateTime(t.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        <Pagination page={data.page} pages={data.pages} buildHref={buildHref} />
      </section>
    </>
  );
}

/** A ledger row can outlive its member, so the link is conditional on the id. */
function MemberLink({ id, name }: { id: string; name: string }) {
  if (!id) return <p className="font-medium text-ink-500">{name}</p>;
  return (
    <Link href={`/admin/users/${id}`} className="font-medium text-brand-700 hover:underline">
      {name}
    </Link>
  );
}
