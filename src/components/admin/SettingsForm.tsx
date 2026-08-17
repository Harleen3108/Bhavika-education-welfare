"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { updateSettings } from "@/server/actions/settings";

type Settings = {
  referral: { referrerReward: number; referredReward: number; requireEmailVerification: boolean; requireFirstQuiz: boolean };
  quiz: { defaultTimeLimitSeconds: number; defaultMaxAttempts: number; defaultPointsPerCorrect: number };
  activity: { profileCompletionPoints: number };
  integration: { redemptionEnabled: boolean };
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [v, setV] = React.useState<Settings>(initial);
  const [saving, setSaving] = React.useState(false);

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

  const Num = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
    <div>
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
  const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) => (
    <label className="flex items-center gap-2.5 text-sm font-medium text-ink-800">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500" />
      {label}
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Referral rules</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Num label="Referrer reward (points)" value={v.referral.referrerReward} onChange={(n) => setV({ ...v, referral: { ...v.referral, referrerReward: n } })} />
            <Num label="Referred bonus (points)" value={v.referral.referredReward} onChange={(n) => setV({ ...v, referral: { ...v.referral, referredReward: n } })} />
          </div>
          <Check label="Require email verification to qualify" checked={v.referral.requireEmailVerification} onChange={(b) => setV({ ...v, referral: { ...v.referral, requireEmailVerification: b } })} />
          <Check label="Require first quiz to qualify" checked={v.referral.requireFirstQuiz} onChange={(b) => setV({ ...v, referral: { ...v.referral, requireFirstQuiz: b } })} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Quiz defaults</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Num label="Default time limit (seconds)" value={v.quiz.defaultTimeLimitSeconds} onChange={(n) => setV({ ...v, quiz: { ...v.quiz, defaultTimeLimitSeconds: n } })} />
            <Num label="Default max attempts" value={v.quiz.defaultMaxAttempts} onChange={(n) => setV({ ...v, quiz: { ...v.quiz, defaultMaxAttempts: n } })} />
            <Num label="Default points / correct" value={v.quiz.defaultPointsPerCorrect} onChange={(n) => setV({ ...v, quiz: { ...v.quiz, defaultPointsPerCorrect: n } })} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Activity rewards</CardTitle>
          <Num label="Profile completion points" value={v.activity.profileCompletionPoints} onChange={(n) => setV({ ...v, activity: { ...v.activity, profileCompletionPoints: n } })} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Phase 2 integration</CardTitle>
          <p className="text-sm text-ink-500">
            Enable benefit redemption only once the Jai Maa Durga platform is live and the secure
            server-to-server integration is configured.
          </p>
          <Check label="Enable benefit redemption (Jai Maa Durga)" checked={v.integration.redemptionEnabled} onChange={(b) => setV({ ...v, integration: { ...v.integration, redemptionEnabled: b } })} />
        </CardBody>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={save} loading={saving} size="lg">Save settings</Button>
      </div>
    </div>
  );
}
