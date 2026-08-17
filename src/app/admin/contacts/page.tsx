import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ContactsTable } from "@/components/admin/ContactsTable";
import { adminListContacts } from "@/server/services/admin-read.service";
import { ContactStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contacts — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUSES = ["", ...Object.values(ContactStatus)];

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await adminListContacts({ status: sp.status, page });

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sp.status) params.set("status", sp.status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/contacts${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Contact submissions" description="Messages sent through the contact form." />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = (sp.status ?? "") === s;
          return (
            <Link
              key={s || "all"}
              href={s ? `/admin/contacts?status=${s}` : "/admin/contacts"}
              className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200")}
            >
              {s || "All"}
            </Link>
          );
        })}
      </div>

      <ContactsTable items={data.items} />
      <Pagination page={data.page} pages={data.pages} buildHref={buildHref} />
    </>
  );
}
