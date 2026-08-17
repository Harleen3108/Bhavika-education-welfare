import type { Metadata } from "next";
import Link from "next/link";
import { Users, UserCheck, UserPlus, Trophy, Gift, Coins, Mail, Activity } from "lucide-react";
import { getAdminStats } from "@/server/services/admin-stats.service";
import { listAuditLogs } from "@/server/services/audit.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, audits] = await Promise.all([getAdminStats(), listAuditLogs(12)]);

  return (
    <>
      <PageHeader title="Admin dashboard" description="Overview of your platform." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.users.total} icon={<Users size={22} />} tone="brand" isPoints={false} />
        <StatCard label="Active users" value={stats.users.active} icon={<UserCheck size={22} />} tone="accent" isPoints={false} />
        <StatCard label="New today" value={stats.users.newToday} icon={<UserPlus size={22} />} tone="neutral" isPoints={false} />
        <StatCard label="Pending" value={stats.users.pending} icon={<Users size={22} />} tone="neutral" isPoints={false} />
        <StatCard label="Quizzes" value={stats.quizzes.total} icon={<Trophy size={22} />} tone="brand" isPoints={false} />
        <StatCard label="Attempts today" value={stats.quizzes.attemptsToday} icon={<Activity size={22} />} tone="accent" isPoints={false} />
        <StatCard label="Referrals rewarded" value={stats.referrals.rewarded} icon={<Gift size={22} />} tone="brand" isPoints={false} />
        <StatCard label="Points issued" value={stats.points.totalIssued} icon={<Coins size={22} />} tone="accent" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <CardTitle>Recent admin activity</CardTitle>
            {audits.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">No admin actions logged yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-ink-100">
                {audits.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-800">{a.action}</p>
                      <p className="text-xs text-ink-500">
                        by {a.admin}
                        {a.reason ? ` — ${a.reason}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-400">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Needs attention</CardTitle>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-700"><Mail size={16} /> New messages</span>
                <Link href="/admin/contacts" className="font-semibold text-brand-600">{stats.contacts.new} →</Link>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-700"><Users size={16} /> Pending users</span>
                <Link href="/admin/users?status=PENDING" className="font-semibold text-brand-600">{stats.users.pending} →</Link>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
