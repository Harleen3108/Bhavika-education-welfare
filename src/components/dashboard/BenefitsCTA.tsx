"use client";

import * as React from "react";
import { Gift, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { formatPoints } from "@/lib/utils";
import type { RedemptionState } from "@/server/services/integration.service";

export function BenefitsCTA({ state }: { state: RedemptionState }) {
  const [points, setPoints] = React.useState(state.minRedeem);
  const [busy, setBusy] = React.useState(false);

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

  if (!state.enabled) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Lock size={30} />
        </div>
        <h2 className="text-xl font-bold text-ink-900">Benefits are coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-600">
          Soon you&apos;ll be able to use your points for eligible benefits through our partner
          platform, <strong>Jai Maa Durga</strong>. Keep earning — your{" "}
          <strong>{formatPoints(state.balance)}</strong> points will be ready when it launches.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-600">
          <Gift size={16} /> Redemption unlocks in Phase 2
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 p-8 text-white shadow-card">
      <Gift size={32} className="text-accent-400" />
      <h2 className="mt-3 text-xl font-bold text-white">Use your benefits</h2>
      <p className="mt-1 text-white/70">
        You have <strong>{formatPoints(state.balance)}</strong> points. Redeem them securely on Jai
        Maa Durga (minimum {state.minRedeem}).
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input
          type="number"
          min={state.minRedeem}
          max={state.balance}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="text-ink-900"
        />
        <Button
          onClick={redeem}
          loading={busy}
          variant="secondary"
          className="shrink-0 bg-white text-brand-700 hover:bg-white/90"
          disabled={points < state.minRedeem || points > state.balance}
        >
          Redeem <ArrowRight size={16} />
        </Button>
      </div>
      <p className="mt-3 text-xs text-white/60">
        You&apos;ll be securely handed off to the partner platform. Points are only deducted once
        the redemption is confirmed.
      </p>
    </div>
  );
}
