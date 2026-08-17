import type { Metadata } from "next";
import { Info } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getRedemptionState } from "@/server/services/integration.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BenefitsCTA } from "@/components/dashboard/BenefitsCTA";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Benefits", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BenefitsPage() {
  const session = await getSessionUser();
  const state = await getRedemptionState(session!.id);

  return (
    <>
      <PageHeader title="Benefits" description="Put your engagement points to good use." />
      <div className="mx-auto max-w-2xl">
        <BenefitsCTA state={state} />

        <Card className="mt-6">
          <CardBody>
            <div className="flex items-start gap-3">
              <Info size={20} className="mt-0.5 shrink-0 text-brand-500" />
              <div className="text-sm text-ink-600">
                <p className="font-medium text-ink-800">How redemption works</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Your points live securely in your Bhavika wallet.</li>
                  <li>When you redeem, we hand you off to Jai Maa Durga with a short-lived, signed link — your balance is never exposed in a URL.</li>
                  <li>Points are deducted only once the partner platform confirms the redemption, and never twice.</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
