import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users, ShieldCheck, MailCheck, MailX } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { Avatar } from "@/components/ui/Avatar";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { adminListUsers, type AdminUserRow } from "@/server/services/admin-read.service";
import { AccountStatus, UserRole } from "@/lib/enums";
import { formatDate, formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Users — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUSES = Object.values(AccountStatus) as string[];
const ROLES = Object.values(UserRole) as string[];

function statusTone(s: string) {
  if (s === AccountStatus.ACTIVE) return "success" as const;
  if (s === AccountStatus.BLOCKED || s === AccountStatus.SUSPENDED) return "danger" as const;
  return "warning" as const;
}

function oneOf(value: string | undefined, allowed: string[]): string | undefined {
  return value && allowed.includes(value) ? value : undefined;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; role?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const status = oneOf(sp.status, STATUSES);
  const role = oneOf(sp.role, ROLES);
  const page = Math.max(1, Number(sp.page) || 1);

  const data = await adminListUsers({ q, status, role, page });
  const filtered = Boolean(q || status || role);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (role) params.set("role", role);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Users"
        description={`${formatPoints(data.total)} member${data.total === 1 ? "" : "s"}${
          filtered ? " matching these filters" : ""
        }`}
        action={<CreateUserForm />}
      />

      <Card className="mb-6">
        <CardBody className="p-4 sm:p-5">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Label htmlFor="u-q">Search</Label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <Input
                  id="u-q"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Name, email, or any referral code"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="u-status">Status</Label>
              <Select id="u-status" name="status" defaultValue={status ?? ""}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="u-role">Role</Label>
              <Select id="u-role" name="role" defaultValue={role ?? ""}>
                <option value="">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" size="sm">
                Apply
              </Button>
              {filtered && (
                <Link
                  href="/admin/users"
                  className="rounded-full px-4 py-2 text-sm font-medium text-ink-600 hover:text-brand-700"
                >
                  Clear filters
                </Link>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<Users size={36} />}
          title={filtered ? "No members match" : "No members yet"}
          description={
            filtered
              ? "Try a broader search, or clear the status and role filters."
              : "Members appear here as they register — or add one yourself."
          }
          action={
            filtered ? (
              <Link
                href="/admin/users"
                className="text-sm font-semibold text-brand-700 hover:underline"
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Phone: one card per member. Seven columns cannot survive 360px. */}
          <ul className="space-y-3 lg:hidden">
            {data.items.map((u) => (
              <li key={u.id}>
                <Card interactive>
                  <CardBody className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar src={u.avatarUrl} name={u.name} size={44} />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="block truncate font-semibold text-brand-700 hover:underline"
                        >
                          {u.name}
                        </Link>
                        <p className="truncate text-sm text-ink-600">{u.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                          {u.role === UserRole.ADMIN && (
                            <Badge tone="brand">
                              <ShieldCheck size={12} /> Admin
                            </Badge>
                          )}
                          <VerifiedBadge verified={u.emailVerified} />
                        </div>
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="block text-xs text-ink-500">Points</span>
                        <span className="block font-semibold text-ink-900">
                          {formatPoints(u.points)}
                        </span>
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-ink-100 pt-3 text-sm">
                      <div>
                        <dt className="text-xs text-ink-500">Referral code</dt>
                        <dd className="mt-0.5">
                          <CodeChip code={u.referralCode} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-500">Referred to</dt>
                        <dd className="mt-0.5">
                          <ReferredTo user={u} />
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-ink-500">Referred by</dt>
                        <dd className="mt-0.5">
                          <ReferredBy user={u} />
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs text-ink-400">Joined {formatDate(u.createdAt)}</p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-ink-500">
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Referral code</th>
                    <th className="px-4 py-3 font-medium">Referred by</th>
                    <th className="px-4 py-3 font-medium">Referred to</th>
                    <th className="px-4 py-3 text-right font-medium">Points</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.items.map((u) => (
                    <tr key={u.id} className="align-middle hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatarUrl} name={u.name} size={36} />
                          <div className="min-w-0">
                            <Link
                              href={`/admin/users/${u.id}`}
                              className="block truncate font-medium text-brand-700 hover:underline"
                            >
                              {u.name}
                            </Link>
                            <p className="truncate text-xs text-ink-400">{u.email}</p>
                          </div>
                          {u.role === UserRole.ADMIN && (
                            <Badge tone="brand" className="shrink-0">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <CodeChip code={u.referralCode} />
                      </td>
                      <td className="px-4 py-3">
                        <ReferredBy user={u} />
                      </td>
                      <td className="px-4 py-3">
                        <ReferredTo user={u} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-ink-800">
                        {formatPoints(u.points)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                          <VerifiedBadge verified={u.emailVerified} />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-500">
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Pagination page={data.page} pages={data.pages} buildHref={buildHref} />
    </>
  );
}

function CodeChip({ code }: { code: string }) {
  if (!code) return <span className="text-ink-400">—</span>;
  return (
    <span className="inline-block rounded-lg bg-ink-100 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-ink-700">
      {code}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge tone="neutral">
      <MailCheck size={12} /> Verified
    </Badge>
  ) : (
    <Badge tone="warning">
      <MailX size={12} /> Unverified
    </Badge>
  );
}

/** Who invited this member. */
function ReferredBy({ user }: { user: AdminUserRow }) {
  if (!user.referredBy) return <span className="text-sm text-ink-400">Direct signup</span>;
  return (
    <Link
      href={`/admin/users/${user.referredBy.id}`}
      className="group inline-block min-w-0 max-w-full"
    >
      <span className="block truncate text-sm font-medium text-ink-800 group-hover:text-brand-700 group-hover:underline">
        {user.referredBy.name}
      </span>
      <span className="block truncate font-mono text-xs text-ink-500">
        {user.referredBy.code}
      </span>
    </Link>
  );
}

/**
 * Who this member invited. The count links to a search on their own code, which
 * `adminListUsers` matches against `referralCodeUsed` — so the result is exactly
 * the people who signed up with it.
 */
function ReferredTo({ user }: { user: AdminUserRow }) {
  if (user.referredCount === 0) return <span className="text-sm text-ink-400">None</span>;
  return (
    <Link
      href={`/admin/users?q=${encodeURIComponent(user.referralCode)}`}
      className="text-sm font-medium text-brand-700 hover:underline"
    >
      {user.referredCount} member{user.referredCount === 1 ? "" : "s"}
    </Link>
  );
}
