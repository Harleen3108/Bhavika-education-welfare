"use client";

import * as React from "react";
import { ArrowRight, Coins, Lock, Minus, Plus, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Hi } from "@/components/ui/Bilingual";
import { formatPoints } from "@/lib/utils";
import type { RedemptionState } from "@/server/services/integration.service";

/* Rupees share the points formatter so both use en-IN grouping (₹1,00,000). */
const rupees = (n: number) => `₹${formatPoints(n)}`;

/**
 * Coupon value of a point amount. Mirrors `pointsToRupees` on the server, which
 * cannot be imported here — integration.service is "server-only" and pulling it
 * into the browser bundle is a build error. Only the RedemptionState *type*
 * crosses that line, and types are erased.
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
  return {
    step,
    lowest,
    highest,
    awayBy,
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
   Rendered in every state — including when redemption is switched off, where
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
          aria-label="Progress towards the redemption threshold"
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
              You have passed {formatPoints(state.minRedeem)} points — you are eligible to redeem.
            </p>
            <Hi className="mt-0.5 block text-white">
              आप {formatPoints(state.minRedeem)} पॉइंट्स पार कर चुके हैं — अब भुना सकते हैं।
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
}: {
  label: string;
  labelHi: string;
  value: string;
  valueHi: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-surface p-3.5">
      <dt className="type-label text-ink-500">
        {label}
        <Hi inline className="ml-1.5 tracking-normal normal-case text-ink-600">
          {labelHi}
        </Hi>
      </dt>
      <dd className="mt-1.5">
        <span className="block font-semibold text-ink-900">{value}</span>
        <Hi className="block text-ink-600">{valueHi}</Hi>
        {note && <span className="mt-1 block text-sm font-semibold text-brand-700">{note}</span>}
      </dd>
    </div>
  );
}

function RulesCard({ state, e }: { state: RedemptionState; e: Economics }) {
  /* Concrete amounts beat the word "multiples" for a first-time reader. */
  const examples = [e.lowest, e.lowest + e.step, e.lowest + e.step * 2]
    .map((p) => formatPoints(p))
    .join(" · ");

  return (
    <div className="mt-4">
      <h2 className="text-base font-semibold text-ink-900">How redeeming works</h2>
      <Hi className="mt-0.5 block text-ink-600">भुनाने के नियम</Hi>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
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
      </dl>

      <p className="mt-3 text-sm text-ink-600">
        So the amounts you can redeem are {examples} … and so on — never an amount in between.
      </p>
      <Hi className="mt-0.5 block text-ink-600">
        यानी {examples} … इसी तरह भुना सकते हैं — बीच की कोई रकम नहीं।
      </Hi>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   3. THE ACTION (or an honest explanation of why there is none).
   ───────────────────────────────────────────────────────────────────────── */

/** Shared shell for the three no-action states, so they read as one family. */
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

function ComingSoonPanel({ state, e }: { state: RedemptionState; e: Economics }) {
  return (
    <NoticePanel
      icon={<Lock size={26} />}
      title="Redemption opens when the Jai Maa Durga store goes live"
      titleHi="जय माँ दुर्गा स्टोर शुरू होते ही भुनाना चालू हो जाएगा"
    >
      <p>
        There is nothing you need to do, and nothing to lose. Your{" "}
        {formatPoints(state.balance)} points stay in your wallet, they do not expire, and the
        rules above are exactly the ones that will apply on the first day.
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

function MaintenancePanel() {
  return (
    <NoticePanel
      icon={<Wrench size={26} />}
      title="Redemption is being connected right now"
      titleHi="भुनाने की सुविधा अभी जोड़ी जा रही है"
    >
      <p>
        Redemption is switched on, but the secure link to the Jai Maa Durga store is still being
        set up. Please check back shortly — your points are untouched.
      </p>
      <Hi className="mt-2 block text-ink-600">
        भुनाना चालू है, पर स्टोर से सुरक्षित जुड़ाव अभी बन रहा है। थोड़ी देर बाद देखें — आपके
        पॉइंट्स सुरक्षित हैं।
      </Hi>
    </NoticePanel>
  );
}

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
        Redemption is open — you just need {formatPoints(state.minRedeem)} points to start. Daily
        quizzes, inviting friends and completing your profile all add up.
      </p>
      <Hi className="mt-2 block text-ink-600">
        भुनाना चालू है — शुरू करने के लिए {formatPoints(state.minRedeem)} पॉइंट्स चाहिए। रोज़ की
        क्विज़, दोस्तों को जोड़ना और प्रोफ़ाइल पूरी करना — सब से पॉइंट्स बढ़ते हैं।
      </Hi>
    </NoticePanel>
  );
}

function RedeemPanel({ state, e }: { state: RedemptionState; e: Economics }) {
  const [points, setPoints] = React.useState(e.lowest);
  const [busy, setBusy] = React.useState(false);

  const value = toRupees(points, state.pointsPerRupee);
  const canDecrease = points - e.step >= e.lowest;
  const canIncrease = points + e.step <= e.highest;
  const valid = points >= e.lowest && points <= e.highest && points % e.step === 0;

  const redeem = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/integration/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Could not start redemption.");
        return;
      }
      // Hand off to the external platform via the signed short-lived link.
      window.location.href = json.redirectUrl;
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-ink-200 bg-surface p-5 shadow-card sm:p-6">
      <h3 className="text-lg font-bold text-ink-900">Choose how much to redeem</h3>
      <Hi className="mt-0.5 block text-brand-700">कितने पॉइंट्स भुनाने हैं, चुनें</Hi>

      {/*
        A stepper rather than a free number field. The server rejects anything
        that is not a whole multiple of the step, and a member typing their
        exact balance — rarely a multiple — earned a 400 they could not have
        predicted. Here every reachable value is a value the server accepts.
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
          The live region is the whole readout, not just the number. Announcing
          the digits alone gave a screen-reader user pressing + a bare stream of
          numbers with no unit and no rupee value; aria-atomic re-reads the
          amount, what it buys, and the Hindi line together on every step.
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
          className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-700 underline underline-offset-4 disabled:text-ink-400 disabled:no-underline"
        >
          Use all {formatPoints(e.highest)} points ({rupees(toRupees(e.highest, state.pointsPerRupee))})
        </button>
      </div>

      <Button
        variant="gradient"
        size="lg"
        onClick={redeem}
        loading={busy}
        disabled={!valid}
        className="mt-2 w-full"
      >
        Redeem {rupees(value)} <ArrowRight size={18} />
      </Button>

      <p className="mt-3 text-center text-sm text-ink-600">
        You will be handed to Jai Maa Durga on a secure, short-lived link. Points leave your wallet
        only after the store confirms the coupon — never before, and never twice.
      </p>
      <Hi className="mt-1 block text-center text-ink-600">
        आपको सुरक्षित लिंक से जय माँ दुर्गा पर भेजा जाएगा। कूपन की पुष्टि होने के बाद ही पॉइंट्स
        कटेंगे — पहले नहीं, और दो बार कभी नहीं।
      </Hi>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */

export function BenefitsCTA({ state }: { state: RedemptionState }) {
  const e = economics(state);

  return (
    <section aria-labelledby="redeem-heading">
      <h2 id="redeem-heading" className="sr-only">
        Redeem your points
      </h2>

      <WorthCard state={state} e={e} />
      <RulesCard state={state} e={e} />

      {!state.enabled ? (
        <ComingSoonPanel state={state} e={e} />
      ) : !state.externalConfigured ? (
        <MaintenancePanel />
      ) : e.canRedeem ? (
        <RedeemPanel state={state} e={e} />
      ) : (
        <AlmostTherePanel state={state} e={e} />
      )}
    </section>
  );
}
