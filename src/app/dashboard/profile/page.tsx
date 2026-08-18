import type { Metadata } from "next";
import { CheckCircle2, XCircle, Copy } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getProfile } from "@/server/services/user.service";
import { getReferrerName } from "@/server/services/referral.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSessionUser();
  const [profile, referrerName] = await Promise.all([
    getProfile(session!.id),
    getReferrerName(session!.id),
  ]);

  return (
    <>
      <PageHeader title="Your profile" description="Manage your personal details." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* min-w-0: the implicit single track below lg is auto-sized, so without
            it the widest child's min-content becomes the page's minimum width. */}
        <div className="min-w-0 lg:col-span-2">
          <Card>
            <CardBody className="sm:p-7">
              <CardTitle>Edit details</CardTitle>
              <p className="mb-6 mt-1 text-sm text-ink-500">
                Complete your profile (name, phone and city) to earn a one-time bonus.
              </p>
              <ProfileForm profile={profile} />
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardBody>
              <CardTitle>Account</CardTitle>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="Email">{profile.email}</Row>
                <Row label="Status">
                  <Badge tone={profile.status === "ACTIVE" ? "success" : "warning"}>
                    {profile.status}
                  </Badge>
                </Row>
                <Row label="Email verified">
                  {profile.emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 size={16} /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger">
                      <XCircle size={16} /> Not verified
                    </span>
                  )}
                </Row>
                <Row label="Profile complete">
                  {profile.profileCompleted ? (
                    <Badge tone="success">Complete</Badge>
                  ) : (
                    <Badge tone="neutral">Incomplete</Badge>
                  )}
                </Row>
                <Row label="Member since">{formatDate(profile.createdAt)}</Row>
                {/* Display name only — the referrer's email and everything
                    else about them stays private on the member's own view. */}
                <Row label="Referred by">
                  {referrerName ?? <span className="text-ink-500">Direct signup</span>}
                </Row>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>Referral code</CardTitle>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5">
                <code className="min-w-0 flex-1 font-mono text-lg font-bold tracking-wider break-all text-brand-700">
                  {profile.referralCode}
                </code>
                <Copy size={16} className="text-ink-400" />
              </div>
              <p className="mt-2 text-xs text-ink-500">
                Share this code — manage invites on the Referrals page.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

/*
  Stacks below sm because the value can be an email address, and an email is one
  unbreakable token: side-by-side it set a 389px floor that overflowed a 360px
  phone and also blew out the narrow sidebar column at 1024/1440. break-all lets
  it wrap at any character; min-w-0 stops it forcing the row wider than the card.
*/
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 font-medium break-all text-ink-800 sm:text-right">{children}</dd>
    </div>
  );
}
