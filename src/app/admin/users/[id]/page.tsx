import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UserActions } from "@/components/admin/UserActions";
import { TransactionList } from "@/components/wallet/TransactionList";
import { adminGetUserDetail } from "@/server/services/admin-read.service";
import { AccountStatus } from "@/lib/enums";
import { formatDate, formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "User — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

function statusTone(s: string) {
  return s === AccountStatus.ACTIVE ? "success" : s === AccountStatus.BLOCKED || s === AccountStatus.SUSPENDED ? "danger" : "warning";
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
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-brand-700">
        <ArrowLeft size={16} /> All users
      </Link>
      <PageHeader title={user.name} description={user.email} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Account</CardTitle>
                <Badge tone={statusTone(user.status)}>{user.status}</Badge>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <Row label="Phone">{user.phone || "—"}</Row>
                <Row label="City">{user.city || "—"}</Row>
                <Row label="Referral code">{user.referralCode}</Row>
                <Row label="Email verified">{user.emailVerified ? "Yes" : "No"}</Row>
                <Row label="Role">{user.role}</Row>
                <Row label="Joined">{formatDate(user.createdAt)}</Row>
              </dl>
              <div className="mt-5 border-t border-ink-100 pt-4">
                <p className="mb-2 text-sm font-medium text-ink-700">Admin actions</p>
                <UserActions userId={user.id} status={user.status} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>Recent transactions</CardTitle>
              {user.transactions.length === 0 ? (
                <p className="py-4 text-sm text-ink-500">No transactions.</p>
              ) : (
                <div className="mt-2"><TransactionList transactions={user.transactions} /></div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>Quiz history</CardTitle>
              {user.quizHistory.length === 0 ? (
                <p className="py-4 text-sm text-ink-500">No quiz attempts.</p>
              ) : (
                <ul className="mt-3 divide-y divide-ink-100 text-sm">
                  {user.quizHistory.map((h) => (
                    <li key={h.id} className="flex items-center justify-between py-2">
                      <span className="text-ink-700">{h.quiz}</span>
                      <span className="flex items-center gap-3">
                        <Badge tone={h.status === "SUBMITTED" ? "success" : "neutral"}>{h.status}</Badge>
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
              <div className="mt-4 space-y-2 text-sm">
                <WalletRow label="Total" value={user.wallet.total} bold />
                <WalletRow label="Quiz" value={user.wallet.quiz} />
                <WalletRow label="Referral" value={user.wallet.referral} />
                <WalletRow label="Activity" value={user.wallet.activity} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>Referrals made ({user.referrals.length})</CardTitle>
              {user.referrals.length === 0 ? (
                <p className="py-3 text-sm text-ink-500">None yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {user.referrals.map((r) => (
                    <li key={r.id} className="flex items-center justify-between">
                      <span className="text-ink-700">{r.name}</span>
                      <Badge tone={r.status === "REWARDED" ? "success" : "warning"}>{r.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
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
      <dd className="font-medium text-ink-800">{children}</dd>
    </div>
  );
}

function WalletRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-600">{label}</span>
      <span className={bold ? "font-display text-lg font-bold text-brand-800" : "font-medium text-ink-800"}>
        {formatPoints(value)}
      </span>
    </div>
  );
}
