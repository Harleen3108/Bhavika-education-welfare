import type { Metadata } from "next";
import { getSessionUser } from "@/server/auth/session";
import { getRedemptionState, pointsToRupees } from "@/server/services/integration.service";
import { BenefitsCTA } from "@/components/dashboard/BenefitsCTA";
import { Card, CardBody } from "@/components/ui/Card";
import { Hi } from "@/components/ui/Bilingual";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Benefits", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BenefitsPage() {
  const session = await getSessionUser();
  const state = await getRedemptionState(session!.id);

  const thresholdValue = pointsToRupees(state.minRedeem, state.pointsPerRupee);
  const stepValue = pointsToRupees(state.stepPoints, state.pointsPerRupee);

  /* The rules restated as a story, with the live numbers rather than hardcoded
     ones — an admin retuning the economics must not leave this text lying. */
  const steps = [
    {
      en: "Earn points",
      hi: "पॉइंट्स कमाएँ",
      body: "Daily quizzes, referrals and a completed profile credit points to your wallet. Every credit is a permanent ledger entry you can check any time.",
      bodyHi:
        "रोज़ की क्विज़, दोस्तों को जोड़ने और प्रोफ़ाइल पूरी करने से पॉइंट्स मिलते हैं। हर पॉइंट का हिसाब हमेशा दर्ज रहता है।",
    },
    {
      en: `Reach ${formatPoints(state.minRedeem)} points`,
      hi: `${formatPoints(state.minRedeem)} पॉइंट्स तक पहुँचें`,
      body: `That is the minimum for your first coupon — worth ₹${formatPoints(thresholdValue)} at ${formatPoints(state.pointsPerRupee)} points to the rupee.`,
      bodyHi: `पहला कूपन यहीं से शुरू होता है — ₹${formatPoints(thresholdValue)} का, ${formatPoints(state.pointsPerRupee)} पॉइंट्स = ₹1 की दर से।`,
    },
    {
      en: `Redeem in multiples of ${formatPoints(state.stepPoints)}`,
      hi: `${formatPoints(state.stepPoints)} के गुणकों में भुनाएँ`,
      body: `Each step is worth ₹${formatPoints(stepValue)}, so a coupon is always a round amount. Pick how much you want, and we hand you to Jai Maa Durga on a short-lived signed link — your balance is never put in the address bar.`,
      bodyHi: `हर गुणक ₹${formatPoints(stepValue)} का होता है, इसलिए कूपन हमेशा पूरी रकम का बनता है। रकम चुनें और सुरक्षित लिंक से जय माँ दुर्गा पर जाएँ — आपका बैलेंस लिंक में कभी नहीं जाता।`,
    },
    {
      en: "Points move only on confirmation",
      hi: "पुष्टि मिलने पर ही पॉइंट्स कटते हैं",
      body: "Your points stay in your wallet until the store confirms the coupon. A failed or abandoned transfer leaves your balance exactly as it was, and nothing is ever deducted twice.",
      bodyHi:
        "जब तक स्टोर कूपन की पुष्टि नहीं करता, पॉइंट्स आपके वॉलेट में ही रहते हैं। अधूरा या असफल लेन-देन आपका बैलेंस नहीं छूता, और कटौती कभी दो बार नहीं होती।",
    },
  ];

  return (
    <>
      {/* Mirrors PageHeader's shape, with the Hindi line it has no slot for —
          this is a member-facing surface and the heading must be bilingual. */}
      <div className="mb-6 min-w-0">
        <h1 className="text-2xl font-bold break-words text-ink-900 sm:text-3xl">
          Benefits &amp; redemption
        </h1>
        <Hi className="mt-1 block text-lg text-brand-700">पॉइंट्स भुनाएँ</Hi>
        <p className="mt-2 text-sm text-ink-600 sm:text-base">
          Turn the points you have earned into real coupon value at the Jai Maa Durga store.
        </p>
        <Hi className="mt-0.5 block text-ink-600">
          कमाए हुए पॉइंट्स को जय माँ दुर्गा स्टोर पर असली छूट में बदलें।
        </Hi>
      </div>

      <div className="mx-auto max-w-2xl">
        <BenefitsCTA state={state} />

        <Card className="mt-6">
          <CardBody>
            <h2 className="text-base font-semibold text-ink-900">
              From a quiz answer to a discount
            </h2>
            <Hi className="mt-0.5 block text-ink-600">जवाब से छूट तक</Hi>

            <ol className="mt-4 space-y-4">
              {steps.map((s, i) => (
                <li key={s.en} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{s.en}</p>
                    <Hi className="block text-brand-700">{s.hi}</Hi>
                    <p className="mt-1 text-sm text-ink-600">{s.body}</p>
                    <Hi className="mt-0.5 block text-ink-600">{s.bodyHi}</Hi>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
