import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Gift,
  MailCheck,
  MailX,
  ShieldCheck,
  Ticket,
  Trophy,
  UserRoundCheck,
} from "lucide-react";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { UserActions } from "@/components/admin/UserActions";
import { TransactionList } from "@/components/wallet/TransactionList";
import { adminGetUserDetail } from "@/server/services/admin-read.service";
import { AccountStatus, ReferralStatus, UserRole } from "@/lib/enums";
import { formatDate, formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "User — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

function statusTone(s: string) {
  if (s === AccountStatus.ACTIVE) return "success" as const;
  if (s === AccountStatus.BLOCKED || s === AccountStatus.SUSPENDED) return "danger" as const;
  return "warning" as const;
}

function referralTone(s: string) {
  if (s === ReferralStatus.REWARDED) return "success" as const;
  if (s === ReferralStatus.REJECTED) return "danger" as const;
  if (s === ReferralStatus.QUALIFIED) return "accent" as const;
  return "warning" as const;
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await adminGetUserDetail(id);
  if (!user) notFound();

  return (
    <>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-brand-700"
      >
        <ArrowLeft size={16} /> All users
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar src={user.avatarUrl} name={user.name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-ink-900 sm:text-3xl">{user.name}</h1>
          <p className="mt-1 truncate text-ink-600">{user.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge tone={statusTone(user.status)}>{user.status}</Badge>
            {user.role === UserRole.ADMIN && (
              <Badge tone="brand">
                <ShieldCheck size={12} /> Admin
              </Badge>
            )}
            {user.emailVerified ? (
              <Badge tone="neutral">
                <MailCheck size={12} /> Email verified
              </Badge>
            ) : (
              <Badge tone="warning">
                <MailX size={12} /> Email unverified
              </Badge>
            )}
            <Badge tone="accent">
              <Ticket size={12} /> {user.referralCode}
            </Badge>
            {user.redemptionBlocked && (
              <Badge tone="danger">
                <Ban size={12} /> Redemption blocked
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody>
              <CardTitle>Account</CardTitle>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <Row label="Phone">{user.phone || "—"}</Row>
                <Row label="City">{user.city || "—"}</Row>
                <Row label="Role">{user.role}</Row>
                <Row label="Joined">{formatDate(user.createdAt)}</Row>
              </dl>
              <div className="mt-6 border-t border-ink-100 pt-4">
                <p className="mb-3 text-sm font-medium text-ink-700">Admin actions</p>
                <UserActions
                  userId={user.id}
                  status={user.status}
                  emailVerified={user.emailVerified}
                  redemptionBlocked={user.redemptionBlocked}
                  member={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    referralCode: user.referralCode,
                    status: user.status,
                    avatarUrl: user.avatarUrl,
                    balance: user.wallet.total,
                  }}
                />
              </div>
            </CardBody>
          </Card>

          {/* Both directions of the referral graph, on the page where an admin
              is already answering "where did this member come from?". */}
          <Card>
            <CardBody>
              <CardTitle>Referrals</CardTitle>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
                  <p className="type-label mb-2 text-ink-500">Their own code</p>
                  <p className="font-mono text-lg font-bold tracking-wider text-brand-700">
                    {user.referralCode}
                  </p>
                </div>

                <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
                  <p className="type-label mb-2 text-ink-500">Referred by</p>
                  {user.referredBy ? (
                    <>
                      <Link
                        href={`/admin/users/${user.referredBy.id}`}
                        className="block truncate font-semibold text-brand-700 hover:underline"
                      >
                        {user.referredBy.name}
                      </Link>
                      <p className="truncate text-xs text-ink-500">{user.referredBy.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral" className="font-mono">
                          {user.referredBy.code}
                        </Badge>
                        {user.referredBy.status && (
                          <Badge tone={referralTone(user.referredBy.status)}>
                            {user.referredBy.status}
                          </Badge>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-ink-700">Direct signup</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {user.referralCodeUsed
                          ? `Signed up with "${user.referralCodeUsed}", but no member owns that code.`
                          : "Nobody invited this member."}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-700">
                    Referred to ({user.referralStats.total})
                  </p>
                  {user.referralStats.total > 0 && (
                    <p className="text-xs text-ink-500">
                      {user.referralStats.rewarded} rewarded ·{" "}
                      {formatPoints(user.referralStats.pointsEarned)} points earned
                    </p>
                  )}
                </div>

                {user.referrals.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-500">
                    This member has not invited anyone yet.
                  </p>
                ) : (
                  <ul className="rounded-xl border border-ink-200 [&>li+li]:border-t [&>li+li]:border-ink-100">
                    {user.referrals.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                      >
                        <div className="min-w-0">
                          {r.userId ? (
                            <Link
                              href={`/admin/users/${r.userId}`}
                              className="block truncate text-sm font-medium text-brand-700 hover:underline"
                            >
                              {r.name}
                            </Link>
                          ) : (
                            <p className="truncate text-sm font-medium text-ink-700">{r.name}</p>
                          )}
                          <p className="truncate text-xs text-ink-500">
                            {r.email || "—"} · joined {formatDate(r.joinedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {r.rewardPoints > 0 && (
                            <span className="text-sm font-semibold text-success">
                              +{formatPoints(r.rewardPoints)}
                            </span>
                          )}
                          <Badge tone={referralTone(r.status)}>{r.status}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Recent transactions</CardTitle>
                <Link
                  href={`/admin/wallet?userId=${user.id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
                >
                  Full history <ArrowRight size={14} />
                </Link>
              </div>
              {user.transactions.length === 0 ? (
                <EmptyState
                  className="mt-3 border-0 py-8"
                  title="No transactions yet"
                  description="Nothing has moved in or out of this wallet."
                />
              ) : (
                <div className="mt-2">
                  <TransactionList transactions={user.transactions} />
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>Quiz history</CardTitle>
              {user.quizHistory.length === 0 ? (
                <EmptyState
                  className="mt-3 border-0 py-8"
                  icon={<Trophy size={30} />}
                  title="No quiz attempts"
                  description="This member has not taken a quiz yet."
                />
              ) : (
                <ul className="mt-3 divide-y divide-ink-100 text-sm">
                  {user.quizHistory.map((h) => (
                    <li
                      key={h.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                    >
                      <span className="min-w-0 truncate text-ink-700">{h.quiz}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <Badge tone={h.status === "SUBMITTED" ? "success" : "neutral"}>
                          {h.status}
                        </Badge>
                        <span className="font-semibold text-brand-700">{h.score} pts</span>
                        <span className="text-xs text-ink-400">{formatDate(h.date)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <CardTitle>Wallet</CardTitle>
              <p className="mt-3 font-display text-3xl font-bold text-ink-900">
                {formatPoints(user.wallet.total)}
                <span className="ml-1.5 text-base font-medium text-ink-500">points</span>
              </p>
              <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
                <WalletRow label="Quiz" value={user.wallet.quiz} />
                <WalletRow label="Referral" value={user.wallet.referral} />
                <WalletRow label="Activity & adjustments" value={user.wallet.activity} />
              </dl>
              <Link
                href={`/admin/wallet?userId=${user.id}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
              >
                Adjust or audit this wallet <ArrowRight size={14} />
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>Referral summary</CardTitle>
              <dl className="mt-4 space-y-3 text-sm">
                <SummaryRow
                  icon={<UserRoundCheck size={16} />}
                  label="Members invited"
                  value={String(user.referralStats.total)}
                />
                <SummaryRow
                  icon={<Gift size={16} />}
                  label="Rewarded"
                  value={String(user.referralStats.rewarded)}
                />
                <SummaryRow
                  icon={<Trophy size={16} />}
                  label="Points earned"
                  value={formatPoints(user.referralStats.pointsEarned)}
                />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink-800">{children}</dd>
    </div>
  );
}

function WalletRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-medium text-ink-800">{formatPoints(value)}</dd>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-ink-600">
        <span className="text-ink-400">{icon}</span>
        {label}
      </dt>
      <dd className="font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
