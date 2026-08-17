import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { adminListUsers } from "@/server/services/admin-read.service";
import { AccountStatus } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

function statusTone(s: string) {
  return s === AccountStatus.ACTIVE ? "success" : s === AccountStatus.BLOCKED || s === AccountStatus.SUSPENDED ? "danger" : "warning";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await adminListUsers({ q: sp.q, status: sp.status, page });

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.status) params.set("status", sp.status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Users" description={`${data.total} total members`} />

      <form method="get" className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Search name, email or referral code"
            className="w-full rounded-xl border border-ink-300 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-xl border border-ink-300 bg-white px-4 py-2.5 text-sm">
          <option value="">All statuses</option>
          {Object.values(AccountStatus).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Search</button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search or filter." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-ink-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-brand-700 hover:underline">{u.name}</Link>
                      {u.role === "ADMIN" && <Badge tone="brand" className="ml-2">Admin</Badge>}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone(u.status)}>{u.status}</Badge></td>
                    <td className="px-4 py-3 text-ink-500">{formatDate(u.createdAt)}</td>
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
