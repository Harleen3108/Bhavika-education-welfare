import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getRedemptionState, pointsToRupees } from "@/server/services/integration.service";
import { getCouponPolicy, listCoupons, type CouponDTO } from "@/server/services/coupon.service";
import { BenefitsCTA } from "@/components/dashboard/BenefitsCTA";
import { CouponCard } from "@/components/dashboard/CouponCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Hi } from "@/components/ui/Bilingual";
import { CouponStatus } from "@/lib/enums";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Rewards", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Active coupons lead, and within them the one closest to lapsing leads.
 *
 * The service returns newest-first, which is the wrong order for the only
 * decision this list supports: which coupon to spend next. The one with the
 * fewest days left is the one about to be forfeited, so it goes on top. Used
 * and expired coupons are history and stay newest-first.
 */
const STATUS_RANK: Record<CouponStatus, number> = {
  [CouponStatus.ACTIVE]: 0,
  [CouponStatus.REDEEMED]: 1,
  [CouponStatus.VOID]: 2,
  [CouponStatus.EXPIRED]: 3,
};

function sortForMember(coupons: CouponDTO[]): CouponDTO[] {
  return [...coupons].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    if (a.status === CouponStatus.ACTIVE) return a.daysRemaining - b.daysRemaining;
    return Date.parse(b.issuedAt) - Date.parse(a.issuedAt);
  });
}

export default async function BenefitsPage() {
  const session = await getSessionUser();
  const [state, policy, coupons] = await Promise.all([
    getRedemptionState(session!.id),
    getCouponPolicy(),
    listCoupons(session!.id),
  ]);

  const thresholdValue = pointsToRupees(state.minRedeem, state.pointsPerRupee);
  const stepValue = pointsToRupees(state.stepPoints, state.pointsPerRupee);
  const sorted = sortForMember(coupons);
  const activeCount = sorted.filter((c) => c.status === CouponStatus.ACTIVE).length;

  /* The rules restated as a story, with the live numbers rather than hardcoded
     ones — an admin retuning the economics must not leave this text lying. */
  const steps = [
    {
      en: "Earn points",
      hi: "पॉइंट्स कमाएँ",
      body: "Daily quizzes, referrals and a completed profile credit points to your wallet. Every credit is a permanent ledger entry you can check any time, and points in your wallet never expire.",
      bodyHi:
        "रोज़ की क्विज़, दोस्तों को जोड़ने और प्रोफ़ाइल पूरी करने से पॉइंट्स मिलते हैं। हर पॉइंट का हिसाब हमेशा दर्ज रहता है, और वॉलेट के पॉइंट्स कभी खत्म नहीं होते।",
    },
    {
      en: `Reach ${formatPoints(state.minRedeem)} points`,
      hi: `${formatPoints(state.minRedeem)} पॉइंट्स तक पहुँचें`,
      body: `That is the minimum for your first coupon — worth ₹${formatPoints(thresholdValue)} at ${formatPoints(state.pointsPerRupee)} points to the rupee. After that you can add ${formatPoints(state.stepPoints)} points at a time, each worth ₹${formatPoints(stepValue)}.`,
      bodyHi: `पहला कूपन यहीं से शुरू होता है — ₹${formatPoints(thresholdValue)} का, ${formatPoints(state.pointsPerRupee)} पॉइंट्स = ₹1 की दर से। उसके बाद ${formatPoints(state.stepPoints)} पॉइंट्स के हिसाब से बढ़ा सकते हैं, हर गुणक ₹${formatPoints(stepValue)} का।`,
    },
    {
      en: "Generate your coupon code",
      hi: "अपना कूपन कोड बनाएँ",
      body: "Pick the amount, read the confirmation and tap once. The code appears on this page straight away — nobody sends you anywhere else, and nothing is left half-done. The points are deducted in the same instant the coupon is made.",
      bodyHi:
        "रकम चुनें, पुष्टि पढ़ें और एक बार दबाएँ। कोड इसी पेज पर तुरंत दिख जाएगा — कहीं और भेजा नहीं जाएगा, और कुछ अधूरा नहीं रहेगा। कूपन बनते ही उतने पॉइंट्स कट जाते हैं।",
    },
    {
      en: `Use it within ${policy.validityDays} days`,
      hi: `${policy.validityDays} दिन के अंदर इस्तेमाल करें`,
      body: `Keep the code safe and give it at the Jai Maa Durga store. If the coupon is not used within ${policy.validityDays} days it expires — and the points spent on it are not returned.`,
      bodyHi: `कोड सुरक्षित रखें और जय माँ दुर्गा स्टोर पर दें। अगर ${policy.validityDays} दिन में कूपन इस्तेमाल नहीं हुआ तो वह खत्म हो जाएगा — और उस पर लगे पॉइंट्स वापस नहीं मिलेंगे।`,
    },
  ];

  return (
    <>
      {/* Mirrors PageHeader's shape, with the Hindi line it has no slot for —
          this is a member-facing surface and the heading must be bilingual. */}
      <div className="mb-6 min-w-0">
        <h1 className="text-2xl font-bold wrap-break-word text-ink-900 sm:text-3xl">
          Turn points into a coupon
        </h1>
        <Hi className="mt-1 block text-lg text-brand-700">पॉइंट्स से कूपन बनाएँ</Hi>
        <p className="mt-2 text-sm text-ink-600 sm:text-base">
          Convert the points you have earned into a Bhavika coupon code — real money off at the Jai
          Maa Durga store.
        </p>
        {/* "पूरी छूट" would read as "the whole bill free" — the English line
            promises money off a bill, not a free purchase. */}
        <Hi className="mt-0.5 block text-ink-600">
          कमाए हुए पॉइंट्स को भाविका कूपन कोड में बदलें — जय माँ दुर्गा स्टोर पर बिल में सीधी छूट।
        </Hi>
      </div>

      <div className="mx-auto max-w-2xl">
        <BenefitsCTA state={state} validityDays={policy.validityDays} />

        <section aria-labelledby="my-coupons-heading" className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <h2 id="my-coupons-heading" className="text-base font-semibold text-ink-900">
                My coupons
              </h2>
              <Hi className="block text-ink-600">मेरे कूपन</Hi>
            </div>
            {sorted.length > 0 && (
              <p className="type-label tabular-nums text-brand-700">
                {activeCount} active
                <Hi inline className="ml-1.5 tracking-normal normal-case text-ink-600">
                  चालू
                </Hi>
              </p>
            )}
          </div>

          {sorted.length === 0 ? (
            /* A real empty state rather than a blank strip: it says what will
               appear here, so a member who has not made a coupon yet does not
               read the emptiness as something having gone wrong. */
            <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-white/60 px-5 py-12 text-center">
              <Ticket size={30} aria-hidden className="mb-3 text-brand-400" />
              <h3 className="text-base font-semibold text-ink-800">No coupons yet</h3>
              <Hi className="mt-0.5 block text-brand-700">अभी कोई कूपन नहीं</Hi>
              <p className="mt-2 max-w-sm text-sm text-ink-600">
                Every coupon you make will appear here with its code, its value and how many days
                are left on it.
              </p>
              <Hi className="mt-1 block max-w-sm text-sm text-ink-600">
                आप जो भी कूपन बनाएँगे, वह यहाँ अपने कोड, रकम और बचे हुए दिनों के साथ दिखेगा।
              </Hi>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-600">
                Keep these codes safe. The Jai Maa Durga store is not open yet — when it opens, give
                a code there to take its value off your bill.
              </p>
              <Hi className="mt-0.5 block text-sm text-ink-600">
                ये कोड सुरक्षित रखें। जय माँ दुर्गा स्टोर अभी खुला नहीं है — खुलते ही कोड वहाँ दें
                और उतनी रकम बिल से कम करवाएँ।
              </Hi>
              <ul className="mt-3 space-y-3">
                {sorted.map((coupon) => (
                  <li key={coupon.id}>
                    <CouponCard coupon={coupon} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <Card className="mt-8">
          <CardBody>
            <h2 className="text-base font-semibold text-ink-900">
              From a quiz answer to a coupon code
            </h2>
            <Hi className="mt-0.5 block text-ink-600">जवाब से कूपन तक</Hi>

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
