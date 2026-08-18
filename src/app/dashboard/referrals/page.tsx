import type { Metadata } from "next";
import { Users, Clock, Gift, Coins, UserPlus } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getReferralOverview } from "@/server/services/referral.service";
import { ReferralStatus } from "@/lib/enums";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ReferralShare } from "@/components/referral/ReferralShare";
import { Hi } from "@/components/ui/Bilingual";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Referrals", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  switch (status) {
    case ReferralStatus.REWARDED:
      return <Badge tone="success">Rewarded</Badge>;
    case ReferralStatus.QUALIFIED:
      return <Badge tone="brand">Qualified</Badge>;
    case ReferralStatus.REJECTED:
      return <Badge tone="danger">Rejected</Badge>;
    default:
      return <Badge tone="warning">Pending</Badge>;
  }
}

/**
 * Who invited this member.
 *
 * The shortened display name and nothing else — no email, no city, no link
 * through to them. Being handed someone's referral code is not consent to be
 * looked up, and this page is the referred person's view, not the admin one.
 */
function JoinedThrough({ name }: { name: string | null }) {
  return (
    <Card className="mt-6">
      <CardBody className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            name ? "bg-accent-50 text-accent-600" : "bg-ink-100 text-ink-500",
          )}
        >
          <UserPlus size={20} />
        </span>
        {/* min-w-0 + break-words: names are user-supplied and can be long
            enough to push the card past 360px otherwise. */}
        <div className="min-w-0">
          <p className="text-sm text-ink-500">
            {name ? "You joined through" : "You signed up on your own"}
            <Hi inline className="ml-1.5">
              {name ? "आप इनके ज़रिए जुड़े" : "आपने सीधे साइन अप किया"}
            </Hi>
          </p>
          <p className="font-semibold break-words text-ink-900">
            {name ?? "Direct signup"}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

export default async function ReferralsPage() {
  const session = await getSessionUser();
  const data = await getReferralOverview(session!.id);

  return (
    <>
      <PageHeader title="Referrals" description="Invite friends, grow the community, earn points." />

      <ReferralShare
        code={data.code}
        shareLink={data.shareLink}
        perReferralPoints={data.perReferralPoints}
      />

      <JoinedThrough name={data.referredBy} />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total invites" value={data.stats.total} icon={<Users size={22} />} tone="brand" isPoints={false} />
        <StatCard label="Pending" value={data.stats.pending} icon={<Clock size={22} />} tone="neutral" isPoints={false} />
        <StatCard label="Rewarded" value={data.stats.rewarded} icon={<Gift size={22} />} tone="accent" isPoints={false} />
        <StatCard label="Points earned" value={data.stats.pointsEarned} icon={<Coins size={22} />} tone="brand" />
      </div>

      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-lg font-semibold text-ink-900">Your invites</h2>

          {data.referrals.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={<Users size={36} />}
              title="No referrals yet"
              description="Share your link above — when friends join and complete their first quiz, they'll appear here."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-ink-500">
                      <th className="pb-3 font-medium">Friend</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 text-right font-medium">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {data.referrals.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 font-medium text-ink-800">{r.name}</td>
                        <td className="py-3 text-ink-600">{formatDate(r.joinedAt)}</td>
                        <td className="py-3">{statusBadge(r.status)}</td>
                        <td className="py-3 text-right font-semibold text-brand-700">
                          {r.status === ReferralStatus.REWARDED ? `+${r.rewardPoints}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="space-y-3 sm:hidden">
                {data.referrals.map((r) => (
                  <li key={r.id} className="rounded-xl border border-ink-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      {/* Names are user-supplied and can be long; they wrap
                          rather than push the status badge off the card. */}
                      <span className="min-w-0 font-medium break-words text-ink-800">{r.name}</span>
                      <span className="shrink-0">{statusBadge(r.status)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-sm text-ink-500">
                      <span>{formatDate(r.joinedAt)}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-brand-700">
                        {r.status === ReferralStatus.REWARDED ? `+${r.rewardPoints} pts` : "—"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardBody>
      </Card>

      <p className="mt-4 text-center text-sm text-ink-500">
        Rewards are granted automatically once your friend verifies their email and completes their
        first quiz. Self-referrals and duplicate accounts are not eligible.
      </p>
    </>
  );
}
