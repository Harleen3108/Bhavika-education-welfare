import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { adminGetSettings } from "@/server/services/admin-read.service";

export const metadata: Metadata = { title: "Settings — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await adminGetSettings();
  return (
    <>
      <PageHeader title="System settings" description="Tune business rules without a redeploy." />
      <SettingsForm initial={settings} />
    </>
  );
}
