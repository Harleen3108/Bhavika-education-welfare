import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ContentManager } from "@/components/admin/ContentManager";
import { adminGetContent } from "@/server/services/admin-read.service";
import { CONTENT_KEYS } from "@/lib/defaults";

export const metadata: Metadata = { title: "Content — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [about, missionVision, contact] = await Promise.all([
    adminGetContent(CONTENT_KEYS.about),
    adminGetContent(CONTENT_KEYS.missionVision),
    adminGetContent(CONTENT_KEYS.contactInfo),
  ]);
  return (
    <>
      <PageHeader title="Site content" description="Edit the About, Mission/Vision and Contact information shown on the public site." />
      <ContentManager about={about} missionVision={missionVision} contact={contact} />
    </>
  );
}
