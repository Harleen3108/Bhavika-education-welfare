import type { Metadata } from "next";
import { getSessionUser } from "@/server/auth/session";
import { getMyContext } from "@/server/services/idcard.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { IdCardPanel } from "@/components/dashboard/IdCardPanel";

export const metadata: Metadata = { title: "ID Card", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function IdCardPage() {
  const session = await getSessionUser();
  const { card, name, avatarUrl } = await getMyContext(session!.id);

  return (
    <>
      <PageHeader
        title="Member ID card"
        description="Get your official Bhavika member identity card — fill your details once, and download it after approval."
      />
      <div className="mx-auto max-w-2xl">
        <IdCardPanel card={card} name={name} avatarUrl={avatarUrl} />
      </div>
    </>
  );
}
