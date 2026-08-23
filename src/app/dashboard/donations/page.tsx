import type { Metadata } from "next";
import Link from "next/link";
import { Download, HeartHandshake } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getMyDonations } from "@/server/services/donation.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { DonationKind } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Donations", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MyDonationsPage() {
  const session = await getSessionUser();
  const donations = await getMyDonations(session!.id, session!.email);

  return (
    <>
      <PageHeader
        title="My donations"
        description="Every donation you've made — download a receipt or certificate any time."
      />

      {donations.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake size={36} />}
          title="No donations yet"
          description="When you donate — even as a guest with this email — your receipts appear here."
          action={
            <Link href="/#donate" className="text-sm font-semibold text-brand-700 hover:underline">
              Make a donation
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {donations.map((d) => {
            const volunteer = d.kind === DonationKind.VOLUNTEER;
            return (
              <li key={d.id}>
                <Card>
                  <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">
                          {volunteer ? "Volunteer certificate" : `₹${d.amount.toLocaleString("en-IN")}`}
                        </span>
                        <Badge tone="accent">{d.categoryName}</Badge>
                        {d.anonymous && <Badge tone="neutral">Anonymous</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {d.receiptNo} · {formatDate(d.paidAt ?? d.createdAt)}
                      </p>
                    </div>
                    <a
                      href={`/api/donations/${d.id}/receipt`}
                      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-ink-300 px-4 text-sm font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-700"
                    >
                      <Download size={16} /> {volunteer ? "Certificate" : "Receipt"}
                    </a>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
