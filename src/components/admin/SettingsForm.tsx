"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { Hi } from "@/components/ui/Bilingual";
import { formatPoints } from "@/lib/utils";
import type { SettingsInput } from "@/lib/validation/admin";
import { updateSettings } from "@/server/actions/settings";

/*
  Typed from the Zod schema rather than hand-written. The action does
  `$set: { integration: <whole object> }`, so a field this form does not carry
  is a field that disappears from the document on save — as a type alias, that
  mistake is a compile error instead of silent data loss.
*/
type Settings = SettingsInput;
type Integration = Settings["integration"];

const rupees = (n: number) => `₹${formatPoints(n)}`;

/*
  Num and Check are declared at module scope, not inside SettingsForm.
  A component defined during render is a brand-new component type on every
  keystroke, so React unmounts the old input and mounts a fresh one — the field
  loses focus mid-word. (This is what react-hooks/static-components was
  flagging nine times over.)
*/
function Num({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  const id = React.useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="mt-1.5 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    /* min-h-11: the whole row is the 44px touch target, not just the box. */
    <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-ink-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        // shrink-0: without it a long label squeezes the box out of square —
        // "Enable redemption…" flattened it to 15.3x20 at 360px.
        className="h-5 w-5 shrink-0 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
      />
      {label}
    </label>
  );
}

/**
 * Mirrors `settingsSchema.integration` in lib/validation/admin.ts. The server
 * remains the authority; this exists so the admin sees WHY a combination is
 * refused while typing, instead of after a round-trip.
 */
function redemptionIssues(v: Integration): string[] {
  const issues: string[] = [];
  const min = v.minRedeemPoints;
  const rate = v.pointsPerRupee;
  const step = v.redeemStepPoints;
  const whole = (n: number) => Number.isInteger(n) && n >= 1;

  if (!whole(min)) issues.push("Minimum to redeem must be a whole number of points, at least 1.");
  if (!whole(rate)) issues.push("Points per rupee must be a whole number, at least 1.");
  if (!whole(step)) issues.push("Step size must be a whole number of points, at least 1.");
  if (issues.length > 0) return issues;

  if (step > min) {
    issues.push(
      `The step (${formatPoints(step)}) is larger than the minimum (${formatPoints(min)}), so the minimum you advertise is not itself a redeemable amount.`,
    );
  } else if (min % step !== 0) {
    const nearest = Math.round(min / step) * step;
    issues.push(
      `${formatPoints(min)} is not a whole number of ${formatPoints(step)}-point steps. A member who reaches exactly ${formatPoints(min)} would be told they are eligible and then refused. Try ${formatPoints(nearest)}.`,
    );
  }

  if (step % rate !== 0) {
    issues.push(
      `A ${formatPoints(step)}-point step at ${formatPoints(rate)} points per rupee is ₹${(step / rate).toFixed(2)}. Coupon value is rounded down, so the member would lose the paise on every redemption. Use a step that divides evenly by ${formatPoints(rate)}.`,
    );
  }

  return issues;
}

/**
 * The numbers alone mean nothing to an admin — "pointsPerRupee: 10" does not
 * read as "₹500". This renders the economics the member will actually see,
 * recomputed on every keystroke.
 */
function RedemptionPreview({ v }: { v: Integration }) {
  const issues = redemptionIssues(v);

  if (issues.length > 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
          <AlertTriangle size={16} aria-hidden /> These numbers cannot be saved
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-red-800">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </div>
    );
  }

  const thresholdValue = v.minRedeemPoints / v.pointsPerRupee;
  const stepValue = v.redeemStepPoints / v.pointsPerRupee;
  const examples = [
    v.minRedeemPoints,
    v.minRedeemPoints + v.redeemStepPoints,
    v.minRedeemPoints + v.redeemStepPoints * 2,
  ]
    .map((p) => formatPoints(p))
    .join(" · ");

  return (
    <div className="rounded-xl border border-accent-200 bg-accent-50/60 p-4">
      <p className="type-label text-accent-700">What members will see</p>
      <p className="mt-2 text-lg font-bold text-ink-900">
        {formatPoints(v.minRedeemPoints)} points = {rupees(thresholdValue)}
      </p>
      <Hi className="mt-0.5 block text-ink-700">
        {formatPoints(v.minRedeemPoints)} पॉइंट्स = {rupees(thresholdValue)}
      </Hi>
      <p className="mt-2 text-sm text-ink-700">
        Redeem in steps of {formatPoints(v.redeemStepPoints)} ({rupees(stepValue)}) ·{" "}
        {formatPoints(v.pointsPerRupee)} points = ₹1
      </p>
      <p className="mt-2 text-sm text-ink-600">
        Valid amounts: {examples} … and so on.
      </p>
      {!v.redemptionEnabled && (
        <p className="mt-3 border-t border-accent-200 pt-3 text-sm text-ink-600">
          Redemption is switched off, so no one can redeem yet — but members still see these
          figures on their Benefits page, so they know what their points are worth.
        </p>
      )}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [v, setV] = React.useState<Settings>(initial);
  const [saving, setSaving] = React.useState(false);

  const blocking = redemptionIssues(v.integration).length > 0;

  const setIntegration = (patch: Partial<Integration>) =>
    setV((prev) => ({ ...prev, integration: { ...prev.integration, ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateSettings(v);
      if (!res.ok) return toast.error(res.error);
      toast.success("Settings saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Referral rules</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Num
              label="Referrer reward (points)"
              value={v.referral.referrerReward}
              min={0}
              onChange={(n) => setV({ ...v, referral: { ...v.referral, referrerReward: n } })}
            />
            <Num
              label="Referred bonus (points)"
              value={v.referral.referredReward}
              min={0}
              onChange={(n) => setV({ ...v, referral: { ...v.referral, referredReward: n } })}
            />
          </div>
          <Check
            label="Require email verification to qualify"
            checked={v.referral.requireEmailVerification}
            onChange={(b) =>
              setV({ ...v, referral: { ...v.referral, requireEmailVerification: b } })
            }
          />
          <Check
            label="Require first quiz to qualify"
            checked={v.referral.requireFirstQuiz}
            onChange={(b) => setV({ ...v, referral: { ...v.referral, requireFirstQuiz: b } })}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Quiz defaults</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Num
              label="Default time limit (seconds)"
              value={v.quiz.defaultTimeLimitSeconds}
              min={30}
              max={7200}
              onChange={(n) => setV({ ...v, quiz: { ...v.quiz, defaultTimeLimitSeconds: n } })}
            />
            <Num
              label="Default max attempts"
              value={v.quiz.defaultMaxAttempts}
              min={1}
              max={10}
              onChange={(n) => setV({ ...v, quiz: { ...v.quiz, defaultMaxAttempts: n } })}
            />
            <Num
              label="Default points / correct"
              value={v.quiz.defaultPointsPerCorrect}
              min={0}
              max={1000}
              onChange={(n) => setV({ ...v, quiz: { ...v.quiz, defaultPointsPerCorrect: n } })}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Activity rewards</CardTitle>
          <Num
            label="Profile completion points"
            value={v.activity.profileCompletionPoints}
            min={0}
            onChange={(n) =>
              setV({ ...v, activity: { ...v.activity, profileCompletionPoints: n } })
            }
          />
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardBody className="space-y-4">
          <CardTitle>Redemption</CardTitle>
          <p className="text-sm text-ink-500">
            What a member&apos;s points are worth, and when they may spend them. These figures are
            quoted verbatim on the member Benefits page and re-checked on the server at every
            redemption, so changing them changes the promise the site makes.
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Num
                label="Minimum to redeem (points)"
                hint="Nothing can be redeemed below this."
                value={v.integration.minRedeemPoints}
                min={1}
                max={1000000}
                onChange={(n) => setIntegration({ minRedeemPoints: n })}
              />
              <Num
                label="Points per rupee"
                hint="10 means 10 points buy ₹1 of coupon."
                value={v.integration.pointsPerRupee}
                min={1}
                max={10000}
                onChange={(n) => setIntegration({ pointsPerRupee: n })}
              />
              <Num
                label="Redeem in steps of (points)"
                hint="Must divide the minimum, and be worth whole rupees."
                value={v.integration.redeemStepPoints}
                min={1}
                max={1000000}
                onChange={(n) => setIntegration({ redeemStepPoints: n })}
              />
            </div>

            <RedemptionPreview v={v.integration} />
          </div>

          <div className="border-t border-ink-200 pt-4">
            <Check
              label="Enable redemption (hand-off to Jai Maa Durga)"
              checked={v.integration.redemptionEnabled}
              onChange={(b) => setIntegration({ redemptionEnabled: b })}
            />
            <p className="text-sm text-ink-500">
              Turn this on only once the Jai Maa Durga store is live and the secure
              server-to-server integration is configured. While it is off, members see their
              points and what they are worth, with no redemption button.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end lg:col-span-2">
        {blocking && (
          <p className="text-sm text-danger sm:text-right">
            Fix the redemption figures above before saving.
          </p>
        )}
        <Button onClick={save} loading={saving} disabled={blocking} size="lg">
          Save settings
        </Button>
      </div>
    </div>
  );
}
