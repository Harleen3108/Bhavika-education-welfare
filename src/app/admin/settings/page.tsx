import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { adminGetSettings } from "@/server/services/admin-read.service";
import { DEFAULT_SETTINGS } from "@/lib/constants";

export const metadata: Metadata = { title: "Settings — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const stored = await adminGetSettings();

  /*
   * Merge over the defaults before the form ever sees them.
   *
   * `adminGetSettings` returns the raw lean document, and a settings document
   * written before the redemption fields existed simply has no
   * minRedeemPoints / pointsPerRupee / redeemStepPoints — Mongoose defaults
   * apply when a document is created, not when an old one is read. Handing
   * `undefined` to a number input turns it into an uncontrolled field, and the
   * admin's first save would then write NaN into the economics every member
   * page quotes.
   */
  const settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    referral: { ...DEFAULT_SETTINGS.referral, ...stored.referral },
    quiz: { ...DEFAULT_SETTINGS.quiz, ...stored.quiz },
    activity: { ...DEFAULT_SETTINGS.activity, ...stored.activity },
    integration: { ...DEFAULT_SETTINGS.integration, ...stored.integration },
  };

  return (
    <>
      <PageHeader title="System settings" description="Tune business rules without a redeploy." />
      <SettingsForm initial={settings} />
    </>
  );
}
