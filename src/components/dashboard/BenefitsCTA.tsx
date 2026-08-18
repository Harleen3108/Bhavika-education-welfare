"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Lock,
  Minus,
  PartyPopper,
  Plus,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Hi } from "@/components/ui/Bilingual";
import { CouponCard } from "@/components/dashboard/CouponCard";
import { formatDate, formatPoints } from "@/lib/utils";
import type { CouponDTO } from "@/server/services/coupon.service";
import type { RedemptionState } from "@/server/services/integration.service";

const DAY_MS = 86_400_000;

/* Rupees share the points formatter so both use en-IN grouping (₹1,00,000). */
const rupees = (n: number) => `₹${formatPoints(n)}`;

/**
 * Coupon value of a point amount. Mirrors `pointsToRupees` on the server, which
 * cannot be imported here — integration.service is "server-only" and pulling it
 * into the browser bundle is a build error. Only the types cross that line, and
 * types are erased.
 */
function toRupees(points: number, pointsPerRupee: number): number {
  return pointsPerRupee > 0 ? Math.floor(points / pointsPerRupee) : 0;
}

type Economics = {
  step: number;
  /** Smallest amount the server would accept: at or above the threshold, and on a step. */
  lowest: number;
  /** Largest amount available right now, already rounded down to a step. */
  highest: number;
  /** Points still needed before anything can be redeemed; 0 once eligible. */
  awayBy: number;
  /**
   * Whether the economics settings can actually produce a coupon. A zero rate
   * or a zero step makes `issueCoupon` throw BAD_RATE/STEP_REDEEM, so offering
   * the button would hand the member a 503 they cannot act on.
   */
  configured: boolean;
  canRedeem: boolean;
  balanceValue: number;
  thresholdValue: number;
  stepValue: number;
  /** Progress toward the threshold, 0-100. */
  pct: number;
};

/**
 * Derived once, used by every panel. `lowest` is computed rather than assumed
 * equal to `minRedeem`: the admin form now guarantees the threshold sits on a
 * step, but settings saved before that rule existed can put the two out of
 * sync, and a member must never be shown a figure the server would reject.
 */
function economics(state: RedemptionState): Economics {
  const step = state.stepPoints > 0 ? state.stepPoints : 1;
  const lowest = Math.ceil(state.minRedeem / step) * step;
  const highest = state.maxRedeemable;
  const awayBy = Math.max(0, lowest - state.balance);
  const configured =
    state.pointsPerRupee > 0 && state.stepPoints > 0 && toRupees(lowest, state.pointsPerRupee) > 0;
  return {
    step,
    lowest,
    highest,
    awayBy,
    configured,
    canRedeem: awayBy === 0 && highest >= lowest && highest > 0,
    balanceValue: state.balanceValue,
    thresholdValue: toRupees(state.minRedeem, state.pointsPerRupee),
    stepValue: toRupees(step, state.pointsPerRupee),
    pct:
      state.minRedeem > 0
        ? Math.min(100, Math.round((state.balance / state.minRedeem) * 100))
        : 100,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   1. THE ANSWER: what you have, what it is worth, how far you are.
   Rendered in every state — including when coupons are switched off, where
   knowing the value of your points is the whole reason to keep playing.
   ───────────────────────────────────────────────────────────────────────── */

function WorthCard({ state, e }: { state: RedemptionState; e: Economics }) {
  return (
    /* bg-gradient-cta, not bg-gradient-brand: this surface carries text. */
    <div className="bg-gradient-cta rounded-2xl p-5 text-white shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Pure white, not white/80: the gold end of bg-gradient-cta only
              clears AA (5.02:1) against full white — at 80% it measures
              3.84:1 here, under the 4.5:1 this 12px label needs. */}
          <p className="type-label text-white">Your points</p>
          <Hi className="mt-0.5 block text-white">आपके पॉइंट्स</Hi>
        </div>
        <Coins size={22} aria-hidden className="mt-0.5 shrink-0 text-white/80" />
      </div>

      <p className="font-display mt-4 text-4xl font-bold tabular-nums">
        {formatPoints(state.balance)}
        <span className="ml-2 align-middle text-base font-semibold text-white">points</span>
      </p>
      <p className="mt-1.5 text-lg font-semibold">
        Worth {rupees(e.balanceValue)} in coupon value
      </p>
      <Hi className="mt-0.5 block text-white">
        यानी {rupees(e.balanceValue)} की कूपन वैल्यू
      </Hi>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold tabular-nums">
            {formatPoints(state.balance)} / {formatPoints(state.minRedeem)}
          </span>
          <span className="tabular-nums text-white">{e.pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Progress towards the first coupon"
          aria-valuenow={e.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/30"
        >
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500"
            style={{ width: `${e.pct}%` }}
          />
        </div>

        {e.awayBy === 0 ? (
          <>
            <p className="mt-3 font-semibold">
              You have passed {formatPoints(state.minRedeem)} points — you can turn them into a
              coupon.
            </p>
            <Hi className="mt-0.5 block text-white">
              आप {formatPoints(state.minRedeem)} पॉइंट्स पार कर चुके हैं — अब इनका कूपन बन सकता है।
            </Hi>
          </>
        ) : (
          <>
            <p className="mt-3 font-semibold">
              {formatPoints(e.awayBy)} more points to unlock your first{" "}
              {rupees(e.thresholdValue)} coupon.
            </p>
            <Hi className="mt-0.5 block text-white">
              पहला {rupees(e.thresholdValue)} का कूपन पाने के लिए {formatPoints(e.awayBy)} पॉइंट्स
              और चाहिए।
            </Hi>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   2. THE RULES, stated plainly before any button appears.
   ───────────────────────────────────────────────────────────────────────── */

function Fact({
  label,
  labelHi,
  value,
  valueHi,
  note,
  noteHi,
}: {
  label: string;
  labelHi: string;
  value: string;
  valueHi: string;
  note?: string;
  noteHi?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-ink-200 bg-surface p-3">
      <dt className="type-label text-ink-500">
        {label}
        <Hi inline className="ml-1.5 tracking-normal normal-case text-ink-600">
          {labelHi}
        </Hi>
      </dt>
      <dd className="mt-1.5">
        <span className="block font-semibold wrap-anywhere text-ink-900">{value}</span>
        <Hi className="block text-ink-600">{valueHi}</Hi>
        {note && <span className="mt-1 block text-sm font-semibold text-brand-700">{note}</span>}
        {noteHi && <Hi className="block text-sm text-brand-700">{noteHi}</Hi>}
      </dd>
    </div>
  );
}

function RulesCard({
  state,
  e,
  validityDays,
}: {
  state: RedemptionState;
  e: Economics;
  validityDays: number;
}) {
  /* Concrete amounts beat the word "multiples" for a first-time reader. */
  const examples = [e.lowest, e.lowest + e.step, e.lowest + e.step * 2]
    .map((p) => formatPoints(p))
    .join(" · ");

  return (
    <div className="mt-4">
      <h2 className="text-base font-semibold text-ink-900">How a coupon works</h2>
      <Hi className="mt-0.5 block text-ink-600">कूपन के नियम</Hi>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact
          label="Rate"
          labelHi="दर"
          value={`${formatPoints(state.pointsPerRupee)} points = ₹1`}
          valueHi={`${formatPoints(state.pointsPerRupee)} पॉइंट्स = ₹1`}
        />
        <Fact
          label="Minimum"
          labelHi="कम से कम"
          value={`${formatPoints(state.minRedeem)} points`}
          valueHi={`${formatPoints(state.minRedeem)} पॉइंट्स`}
          note={`= ${rupees(e.thresholdValue)}`}
        />
        <Fact
          label="In steps of"
          labelHi="गुणकों में"
          value={`${formatPoints(e.step)} points`}
          valueHi={`${formatPoints(e.step)} पॉइंट्स`}
          note={`= ${rupees(e.stepValue)} each`}
        />
        <Fact
          label="Valid for"
          labelHi="कब तक"
          value={`${validityDays} days`}
          valueHi={`${validityDays} दिन`}
          note="then forfeited"
          noteHi="फिर खत्म"
        />
      </dl>

      <p className="mt-3 text-sm text-ink-600">
        So the amounts you can turn into a coupon are {examples} … and so on — never an amount in
        between.
      </p>
      <Hi className="mt-0.5 block text-ink-600">
        यानी {examples} … इसी तरह कूपन बन सकता है — बीच की कोई रकम नहीं।
      </Hi>

      {/*
        The single most important sentence on this page, and the client's
        explicit decision. It sits ABOVE the action in every state — not in
        fine print, and not only inside the confirmation — because a family
        must never discover the forfeit after the fact.
      */}
      <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="flex items-start gap-2 font-bold text-amber-900">
          <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
          <span>Points never expire. A coupon does.</span>
        </p>
        <Hi className="mt-0.5 block text-amber-900">
          पॉइंट्स कभी खत्म नहीं होते। कूपन खत्म हो जाता है।
        </Hi>
        <p className="mt-2 text-sm text-amber-900">
          Your points can sit in your wallet as long as you like. But the moment you turn them into
          a coupon, the points leave your wallet and you have {validityDays} days to use that
          coupon. If it is not used in time it expires — and the points are not returned.
        </p>
        <Hi className="mt-1 block text-sm text-amber-900">
          पॉइंट्स जितना चाहें वॉलेट में रख सकते हैं। लेकिन कूपन बनाते ही पॉइंट्स वॉलेट से कट जाते
          हैं और उस कूपन को {validityDays} दिन में इस्तेमाल करना ज़रूरी है। समय पर इस्तेमाल न हुआ तो
          कूपन खत्म हो जाएगा — और पॉइंट्स वापस नहीं मिलेंगे।
        </Hi>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   3. THE ACTION (or an honest explanation of why there is none).
   ───────────────────────────────────────────────────────────────────────── */

/** Shared shell for the no-action states, so they read as one family. */
function NoticePanel({
  icon,
  title,
  titleHi,
  children,
  action,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  titleHi: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  tone?: "neutral" | "brand";
}) {
  return (
    <div className="mt-4 rounded-2xl border border-ink-200 bg-surface p-5 text-center shadow-card sm:p-6">
      <div
        className={
          tone === "brand"
            ? "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700"
            : "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"
        }
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold text-ink-900">{title}</h3>
      <Hi className="mt-1 block text-brand-700">{titleHi}</Hi>
      <div className="mx-auto mt-3 max-w-md text-sm text-ink-600">{children}</div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

const KEEP_EARNING = (
  <ButtonLink href="/dashboard/quizzes" variant="gradient">
    Play today&apos;s quiz <ArrowRight size={16} />
  </ButtonLink>
);

/** State 1 — coupons switched off. */
function ComingSoonPanel({ state, e }: { state: RedemptionState; e: Economics }) {
  return (
    <NoticePanel
      icon={<Lock size={26} />}
      title="Coupons open when the Jai Maa Durga store goes live"
      titleHi="जय माँ दुर्गा स्टोर शुरू होते ही कूपन बनने लगेंगे"
    >
      <p>
        There is nothing you need to do, and nothing to lose. Your{" "}
        {formatPoints(state.balance)} points stay in your wallet, they do not expire, and the rules
        above are exactly the ones that will apply on the first day.
      </p>
      <Hi className="mt-2 block text-ink-600">
        अभी कुछ करने की ज़रूरत नहीं। आपके {formatPoints(state.balance)} पॉइंट्स वॉलेट में सुरक्षित
        हैं, ये कभी खत्म नहीं होते, और ऊपर लिखे नियम पहले दिन से यही रहेंगे।
      </Hi>
      <p className="mt-3 font-semibold text-ink-800">
        Every point you add now counts — each {formatPoints(state.pointsPerRupee)} points you earn
        is another ₹1 waiting for you.
      </p>
      <Hi className="mt-0.5 block text-ink-600">
        आज कमाया हर पॉइंट गिना जाएगा — हर {formatPoints(state.pointsPerRupee)} पॉइंट्स पर ₹1।
      </Hi>
      {e.balanceValue > 0 && (
        <p className="mt-3 text-brand-700">
          <span className="font-semibold">Today your balance is worth {rupees(e.balanceValue)}.</span>
        </p>
      )}
    </NoticePanel>
  );
}

/**
 * State 2 — coupons are on, but the economics settings cannot produce a real
 * coupon value. Nothing external is needed any more (no store redirect, no
 * secret), so the only way to reach this panel is a rate or step of zero, which
 * would mint a ₹0 coupon and take the points for it.
 */
function NotConfiguredPanel() {
  return (
    <NoticePanel
      icon={<Wrench size={26} />}
      title="Coupon values are still being set up"
      titleHi="कूपन की दरें अभी तय की जा रही हैं"
    >
      <p>
        Coupons are switched on, but the conversion rate has not been set correctly yet, so we
        cannot tell you what a coupon would be worth — and we will not issue one until we can.
        Nothing has been deducted and your points are safe. Please check back shortly.
      </p>
      <Hi className="mt-2 block text-ink-600">
        कूपन चालू हैं, पर दर अभी ठीक से तय नहीं हुई है, इसलिए हम नहीं बता सकते कि कूपन कितने का
        बनेगा — और जब तक यह साफ़ न हो, कूपन नहीं बनाएँगे। कुछ भी नहीं कटा है, आपके पॉइंट्स सुरक्षित
        हैं। थोड़ी देर बाद देखें।
      </Hi>
    </NoticePanel>
  );
}

/** State 3 — coupons are on, but this member is below the threshold. */
function AlmostTherePanel({ state, e }: { state: RedemptionState; e: Economics }) {
  return (
    <NoticePanel
      tone="brand"
      icon={<Sparkles size={26} />}
      title={`${formatPoints(e.awayBy)} points to go`}
      titleHi={`बस ${formatPoints(e.awayBy)} पॉइंट्स और`}
      action={KEEP_EARNING}
    >
      <p>
        Coupons are open — you just need {formatPoints(state.minRedeem)} points to make your first
        one. Daily quizzes, inviting friends and completing your profile all add up.
      </p>
      <Hi className="mt-2 block text-ink-600">
        कूपन चालू हैं — पहला कूपन बनाने के लिए {formatPoints(state.minRedeem)} पॉइंट्स चाहिए। रोज़
        की क्विज़, दोस्तों को जोड़ना और प्रोफ़ाइल पूरी करना — सब से पॉइंट्स बढ़ते हैं।
      </Hi>
    </NoticePanel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   4. GENERATING — pick, then confirm, then the code.
   ───────────────────────────────────────────────────────────────────────── */

function GeneratePanel({
  state,
  e,
  validityDays,
  onIssued,
}: {
  state: RedemptionState;
  e: Economics;
  validityDays: number;
  onIssued: (coupon: CouponDTO) => void;
}) {
  const [points, setPoints] = React.useState(e.lowest);
  /**
   * Null while picking an amount; the confirmation step otherwise.
   *
   * It carries the expiry date rather than deriving it at render time for two
   * reasons: reading the clock during render is impure, and the date shown in
   * a warning a member is about to act on must not silently drift while the
   * warning sits open.
   */
  const [confirming, setConfirming] = React.useState<{ expiresAt: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const confirmHeadingRef = React.useRef<HTMLHeadingElement | null>(null);

  /*
    Moving to the confirmation unmounts the button that had focus, which would
    otherwise drop focus to <body> and leave a screen-reader user unaware that
    a warning about forfeiting their points had just appeared. Focus lands on
    the confirmation heading so the warning is the next thing read.
  */
  React.useEffect(() => {
    if (confirming) confirmHeadingRef.current?.focus();
  }, [confirming]);

  const value = toRupees(points, state.pointsPerRupee);
  const canDecrease = points - e.step >= e.lowest;
  const canIncrease = points + e.step <= e.highest;
  const valid = points >= e.lowest && points <= e.highest && points % e.step === 0;

  const review = () => {
    setConfirming({ expiresAt: new Date(Date.now() + validityDays * DAY_MS).toISOString() });
  };

  const generate = async () => {
    // The server debits and issues in one transaction, so a double tap cannot
    // mint two coupons. This guard is so the UI never invites the attempt.
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/user/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Could not create your coupon. Please try again.");
        // Back to the picker: every reason this fails (balance moved, amount no
        // longer on a step, coupons switched off) is one the member fixes there.
        setConfirming(null);
        return;
      }
      onIssued(json.coupon as CouponDTO);
    } catch {
      // Deliberately NOT "no points were deducted": this catch also fires when
      // the request reached the server, the transaction committed and only the
      // response was lost — common on a weak mobile connection. Promising the
      // wallet is untouched would send a member straight back to the button and
      // mint a second coupon, doubling the points they can forfeit.
      toast.error(
        "We couldn't confirm your coupon. Reload this page and check \"My coupons\" before trying again — it may already have been created.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-ink-200 bg-surface p-5 shadow-card sm:p-6">
      {confirming === null ? (
        <>
          <h3 className="text-lg font-bold text-ink-900">Choose your coupon amount</h3>
          <Hi className="mt-0.5 block text-brand-700">कूपन की रकम चुनें</Hi>

          {/*
            A stepper rather than a free number field. The server rejects
            anything that is not a whole multiple of the step, and a member
            typing their exact balance — rarely a multiple — earned a 400 they
            could not have predicted. Here every reachable value is accepted.
          */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPoints((p) => Math.max(e.lowest, p - e.step))}
              disabled={!canDecrease}
              aria-label={`Reduce by ${formatPoints(e.step)} points`}
              className="h-11 w-11 shrink-0 rounded-full border border-ink-300 text-ink-800 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-ink-300 disabled:hover:text-ink-800"
            >
              <Minus size={18} className="mx-auto" />
            </button>

            {/*
              The live region is the whole readout, not just the number.
              Announcing the digits alone gave a screen-reader user pressing +
              a bare stream of numbers with no unit and no rupee value;
              aria-atomic re-reads the amount, what it buys, and the Hindi line
              together on every step.
            */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="min-w-0 flex-1 rounded-xl bg-ink-50 px-2 py-3 text-center"
            >
              <span className="block text-2xl font-bold tabular-nums text-ink-900">
                {formatPoints(points)}
              </span>
              <span className="block text-sm text-ink-600">
                points = <strong className="text-brand-700">{rupees(value)}</strong> coupon
              </span>
              <Hi className="block text-sm text-ink-600">
                पॉइंट्स = {rupees(value)} का कूपन
              </Hi>
            </div>

            <button
              type="button"
              onClick={() => setPoints((p) => Math.min(e.highest, p + e.step))}
              disabled={!canIncrease}
              aria-label={`Increase by ${formatPoints(e.step)} points`}
              className="h-11 w-11 shrink-0 rounded-full border border-ink-300 text-ink-800 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-ink-300 disabled:hover:text-ink-800"
            >
              <Plus size={18} className="mx-auto" />
            </button>
          </div>

          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setPoints(e.highest)}
              disabled={points === e.highest}
              className="inline-flex min-h-11 items-center px-3 text-center text-sm font-semibold text-brand-700 underline underline-offset-4 disabled:text-ink-400 disabled:no-underline"
            >
              Use all {formatPoints(e.highest)} points (
              {rupees(toRupees(e.highest, state.pointsPerRupee))})
            </button>
          </div>

          <Button
            variant="gradient"
            size="lg"
            onClick={review}
            disabled={!valid}
            className="mt-2 h-auto w-full py-3.5 whitespace-normal"
          >
            <span className="block">
              Review this {rupees(value)} coupon
              <Hi className="block text-white">{rupees(value)} का कूपन देखें</Hi>
            </span>
            <ArrowRight size={18} aria-hidden className="shrink-0" />
          </Button>

          <p className="mt-3 text-center text-sm text-ink-600">
            Nothing is deducted yet. The next step shows exactly what you give, what you get, and
            how long it lasts.
          </p>
          <Hi className="mt-1 block text-center text-ink-600">
            अभी कुछ नहीं कटेगा। अगले कदम पर पूरा हिसाब दिखेगा — क्या देंगे, क्या मिलेगा, और कब तक
            चलेगा।
          </Hi>
        </>
      ) : (
        <>
          <h3
            ref={confirmHeadingRef}
            tabIndex={-1}
            className="text-lg font-bold text-ink-900 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Confirm your {rupees(value)} coupon
          </h3>
          <Hi className="mt-0.5 block text-brand-700">
            {rupees(value)} के कूपन की पुष्टि करें
          </Hi>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-3.5">
              <p className="type-label text-ink-500">
                You give
                <Hi inline className="ml-1.5 tracking-normal normal-case text-ink-600">
                  आप देंगे
                </Hi>
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-ink-900">
                {formatPoints(points)} points
              </p>
              <Hi className="block text-ink-600">{formatPoints(points)} पॉइंट्स</Hi>
            </div>
            <div className="rounded-xl border border-accent-200 bg-accent-50 p-3.5">
              <p className="type-label text-accent-700">
                You get
                <Hi inline className="ml-1.5 tracking-normal normal-case text-accent-700">
                  आपको मिलेगा
                </Hi>
              </p>
              <p className="mt-1 text-lg font-bold text-ink-900">
                A {rupees(value)} coupon code
              </p>
              <Hi className="block text-ink-700">{rupees(value)} का कूपन कोड</Hi>
            </div>
          </div>

          {/*
            The forfeit, in the confirmation itself and in the member's own
            numbers. This is the client's decision and the one thing a member
            must not learn afterwards — so it is a full-width warning between
            the amounts and the button, not a footnote under it.
          */}
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="flex items-start gap-2 font-bold text-amber-900">
              <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
              <span>Please read this before you continue</span>
            </p>
            <Hi className="mt-0.5 block text-amber-900">आगे बढ़ने से पहले यह ज़रूर पढ़ें</Hi>

            <p className="mt-2 text-sm font-semibold text-amber-900">
              This coupon is valid until {formatDate(confirming.expiresAt)} — {validityDays} days
              from today.
            </p>
            <Hi className="mt-1 block text-sm font-semibold text-amber-900">
              यह कूपन {formatDate(confirming.expiresAt)} तक चलेगा — आज से {validityDays} दिन।
            </Hi>

            <p className="mt-2 text-sm font-semibold text-amber-900">
              {formatPoints(points)} points leave your wallet the moment the coupon is created, and
              they do not come back. If the coupon is not used by {formatDate(confirming.expiresAt)}{" "}
              it expires and the {formatPoints(points)} points are not returned. There is no refund
              and no extension.
            </p>
            <Hi className="mt-1 block text-sm font-semibold text-amber-900">
              कूपन बनते ही {formatPoints(points)} पॉइंट्स आपके वॉलेट से कट जाएँगे और वापस नहीं
              आएँगे। अगर {formatDate(confirming.expiresAt)} तक कूपन इस्तेमाल नहीं हुआ तो वह खत्म हो
              जाएगा और {formatPoints(points)} पॉइंट्स वापस नहीं मिलेंगे। न रिफंड मिलेगा, न मियाद
              बढ़ेगी।
            </Hi>

            {/*
              The store does not exist yet, and the issued panel already says so
              AFTER the fact. Said here too, before the button, because the
              validity clock starts on creation: a member who is not told cannot
              act on the advice in the next sentence.
            */}
            <p className="mt-2 text-sm font-semibold text-amber-900">
              The Jai Maa Durga store is not open yet, so this coupon cannot be spent today — but
              its {validityDays} days start the moment it is created.
            </p>
            <Hi className="mt-1 block text-sm font-semibold text-amber-900">
              जय माँ दुर्गा स्टोर अभी खुला नहीं है, इसलिए यह कूपन आज इस्तेमाल नहीं हो सकता — फिर भी
              इसके {validityDays} दिन बनते ही गिनने शुरू हो जाएँगे।
            </Hi>

            <p className="mt-2 text-sm text-amber-900">
              The {validityDays} days start today, so make a coupon when you are ready to use it —
              not before. Your points are safe in your wallet until then.
            </p>
            <Hi className="mt-1 block text-sm text-amber-900">
              {validityDays} दिन आज से गिने जाएँगे, इसलिए कूपन तभी बनाएँ जब इस्तेमाल करना हो — उससे
              पहले नहीं। तब तक आपके पॉइंट्स वॉलेट में सुरक्षित हैं।
            </Hi>
          </div>

          <Button
            variant="gradient"
            size="lg"
            onClick={() => void generate()}
            loading={busy}
            className="mt-4 h-auto w-full py-3.5 whitespace-normal"
          >
            <span className="block">
              Yes, create my {rupees(value)} coupon
              <Hi className="block text-white">हाँ, {rupees(value)} का कूपन बनाएँ</Hi>
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setConfirming(null)}
            disabled={busy}
            className="mt-2 h-auto w-full py-3 whitespace-normal"
          >
            <ArrowLeft size={16} aria-hidden className="shrink-0" />
            <span className="block">
              Go back and change the amount
              <Hi className="block">वापस जाकर रकम बदलें</Hi>
            </span>
          </Button>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   5. THE RESULT — the code, and what to do with it.
   ───────────────────────────────────────────────────────────────────────── */

function IssuedPanel({
  coupon,
  canMakeAnother,
  onDone,
}: {
  coupon: CouponDTO;
  canMakeAnother: boolean;
  onDone: () => void;
}) {
  const headingRef = React.useRef<HTMLHeadingElement | null>(null);

  /* The button that was focused has just unmounted along with the generate
     panel. Focus the result so the code — the thing the member pressed for —
     is what gets read, instead of focus falling to the top of the document. */
  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    /* p-4 on mobile, not p-5: this panel nests a CouponCard, and every pixel of
       padding here comes off the width the coupon code has to lay out in. */
    <div className="mt-4 rounded-2xl border border-ink-200 bg-surface p-4 shadow-card sm:p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
          <PartyPopper size={26} aria-hidden />
        </div>
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-bold text-ink-900 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          Your coupon is ready
        </h3>
        <Hi className="mt-1 block text-brand-700">आपका कूपन तैयार है</Hi>
      </div>

      <div className="mt-4">
        <CouponCard coupon={coupon} highlight />
      </div>

      <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
        <p className="font-bold text-ink-900">Save this code now.</p>
        <Hi className="block text-ink-800">यह कोड अभी सुरक्षित कर लें।</Hi>
        <p className="mt-1">
          Copy it, take a screenshot, or write it down. It is also saved under &ldquo;My
          coupons&rdquo; further down this page and in your wallet history, so you can always find
          it again.
        </p>
        <Hi className="mt-1 block text-ink-700">
          कॉपी करें, स्क्रीनशॉट लें या लिख लें। यह इसी पेज पर नीचे &ldquo;मेरे कूपन&rdquo; में और
          आपके वॉलेट इतिहास में भी दर्ज है, इसलिए दोबारा मिल जाएगा।
        </Hi>

        {/*
          The store genuinely does not exist yet. Saying "spend it now" would be
          a promise the platform cannot keep this week, so the copy says what is
          true: the code is real, it is yours, and here is when it is usable.
        */}
        <p className="mt-3 font-semibold text-ink-900">
          The Jai Maa Durga store is not open yet.
        </p>
        <Hi className="block text-ink-800">जय माँ दुर्गा स्टोर अभी खुला नहीं है।</Hi>
        <p className="mt-1">
          You cannot spend this code today. When the store opens, give this code there and{" "}
          {rupees(coupon.valueRupees)} comes off your bill. It stays valid until{" "}
          {formatDate(coupon.expiresAt)}.
        </p>
        <Hi className="mt-1 block text-ink-700">
          आज इसे खर्च नहीं कर सकते। स्टोर खुलते ही यही कोड वहाँ दें और आपके बिल से{" "}
          {rupees(coupon.valueRupees)} कम हो जाएँगे। यह {formatDate(coupon.expiresAt)} तक चलेगा।
        </Hi>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          onClick={onDone}
          className="h-auto w-full py-3 whitespace-normal sm:flex-1"
        >
          <span className="block">
            {canMakeAnother ? "Make another coupon" : "Done"}
            <Hi className="block">{canMakeAnother ? "एक और कूपन बनाएँ" : "हो गया"}</Hi>
          </span>
        </Button>
        <ButtonLink
          href="/dashboard/wallet"
          variant="subtle"
          className="h-auto w-full py-3 whitespace-normal sm:flex-1"
        >
          <span className="block">
            See it in my wallet
            <Hi className="block">वॉलेट में देखें</Hi>
          </span>
        </ButtonLink>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */

export function BenefitsCTA({
  state,
  validityDays,
}: {
  state: RedemptionState;
  validityDays: number;
}) {
  const e = economics(state);
  const router = useRouter();
  const [issued, setIssued] = React.useState<CouponDTO | null>(null);

  /**
   * The freshly-issued coupon is held HERE rather than inside GeneratePanel on
   * purpose. `router.refresh()` re-runs the page with the new (lower) balance,
   * which can drop the member below the threshold — and if the code lived in
   * the generate panel, that panel would unmount and take the code off screen
   * the instant it was created.
   */
  const handleIssued = (coupon: CouponDTO) => {
    setIssued(coupon);
    router.refresh();
  };

  return (
    <section aria-labelledby="coupon-heading">
      <h2 id="coupon-heading" className="sr-only">
        Turn your points into a coupon
      </h2>

      <WorthCard state={state} e={e} />
      <RulesCard state={state} e={e} validityDays={validityDays} />

      {issued ? (
        <IssuedPanel
          coupon={issued}
          canMakeAnother={state.enabled && e.configured && e.canRedeem}
          onDone={() => setIssued(null)}
        />
      ) : !state.enabled ? (
        <ComingSoonPanel state={state} e={e} />
      ) : !e.configured ? (
        <NotConfiguredPanel />
      ) : e.canRedeem ? (
        <GeneratePanel state={state} e={e} validityDays={validityDays} onIssued={handleIssued} />
      ) : (
        <AlmostTherePanel state={state} e={e} />
      )}
    </section>
  );
}
