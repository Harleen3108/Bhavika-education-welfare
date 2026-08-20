"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, Gift, Coins, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import type { AdjustMember } from "@/components/admin/WalletAdjustForm";
import { adminIssueCouponAction } from "@/server/actions/coupons";
import { cn, formatPoints } from "@/lib/utils";

type Mode = "PROMO" | "POINTS";
const MAX_REASON = 300;

/**
 * Issue a coupon straight to a member from the admin console.
 *
 * PROMO grants free value (nothing leaves the member's wallet); POINTS spends
 * the member's own balance at the live rate. Which one is chosen changes what
 * the confirmation warns about — a promo mints a liability, a points coupon just
 * converts points the member already held.
 *
 * Pass `member` to pin the form to one person (the user detail page); omit it to
 * get the search picker (the coupons page).
 */
export function IssueCouponForm({
  member: preset,
  onIssued,
}: {
  member?: AdjustMember | null;
  onIssued?: () => void;
}) {
  const router = useRouter();
  const [picked, setPicked] = React.useState<AdjustMember | null>(null);
  const member = preset ?? picked;

  const [mode, setMode] = React.useState<Mode>("PROMO");
  const [value, setValue] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const valueRupees = Number(value);
  const validValue = Number.isInteger(valueRupees) && valueRupees >= 1 && valueRupees <= 100000;
  const ready = Boolean(member) && validValue && reason.trim().length >= 3;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !member || !ready) return;

    setSending(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await adminIssueCouponAction({
        userId: member.id,
        mode,
        valueRupees,
        reason: reason.trim(),
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setFormError(res.error);
        return;
      }
      toast.success(`Issued a ₹${formatPoints(res.data?.valueRupees ?? valueRupees)} coupon — ${res.data?.code}.`);
      setValue("");
      setReason("");
      if (!preset) setPicked(null);
      router.refresh();
      onIssued?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      {preset ? (
        <MemberSummary member={preset} />
      ) : member ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
          <Avatar src={member.avatarUrl} name={member.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink-900">{member.name}</p>
            <p className="truncate text-sm text-ink-600">{member.email}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-ink-500">Balance</p>
            <p className="font-semibold text-ink-900">{formatPoints(member.balance)}</p>
          </div>
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-white hover:text-danger"
            aria-label="Choose a different member"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <MemberPicker onPick={setPicked} />
      )}

      <fieldset disabled={!member} className="space-y-5 disabled:opacity-50">
        <div>
          <Label>How is it funded?</Label>
          <div role="radiogroup" aria-label="Funding" className="grid grid-cols-2 gap-2">
            <ModeOption
              value="PROMO"
              current={mode}
              onSelect={setMode}
              icon={<Gift size={18} />}
              label="Free promo"
              hint="Gift — no points spent"
            />
            <ModeOption
              value="POINTS"
              current={mode}
              onSelect={setMode}
              icon={<Coins size={18} />}
              label="From points"
              hint="Spend their balance"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="issue-value" required>
            Coupon value (₹)
          </Label>
          <Input
            id="issue-value"
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            step={1}
            value={value}
            placeholder="e.g. 500"
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(fieldErrors.valueRupees)}
          />
          <FieldError>{fieldErrors.valueRupees}</FieldError>
          <p className="mt-1.5 text-sm text-ink-500">
            {mode === "PROMO"
              ? "A free coupon of this face value. The member pays no points."
              : "Spent from the member's own points at the current rate. Fails if they don't hold enough."}
          </p>
        </div>

        <div>
          <Label htmlFor="issue-reason" required>
            Reason
          </Label>
          <Textarea
            id="issue-reason"
            value={reason}
            maxLength={MAX_REASON}
            placeholder="e.g. Compensation for the cancelled August camp"
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(fieldErrors.reason)}
            className="min-h-20"
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <p className="text-sm text-ink-500">Recorded in the admin audit log.</p>
            <span className="shrink-0 text-xs tabular-nums text-ink-400">
              {reason.length}/{MAX_REASON}
            </span>
          </div>
          <FieldError>{fieldErrors.reason}</FieldError>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <ShieldCheck size={14} className="shrink-0 text-accent-600" />
          Audited. A promo coupon adds to outstanding liability.
        </p>
        <Button type="submit" loading={sending} disabled={!ready}>
          {sending ? "Issuing…" : "Issue coupon"}
        </Button>
      </div>
    </form>
  );
}

function ModeOption({
  value,
  current,
  onSelect,
  icon,
  label,
  hint,
}: {
  value: Mode;
  current: Mode;
  onSelect: (m: Mode) => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(value)}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        active
          ? "border-brand-400 bg-brand-50 text-brand-800"
          : "border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs opacity-80">{hint}</span>
      </span>
    </button>
  );
}

function MemberSummary({ member }: { member: AdjustMember }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
      <Avatar src={member.avatarUrl} name={member.name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink-900">{member.name}</p>
        <p className="truncate text-sm text-ink-600">{member.email}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-ink-500">Balance</p>
        <p className="font-semibold text-ink-900">{formatPoints(member.balance)}</p>
      </div>
    </div>
  );
}

function MemberPicker({ onPick }: { onPick: (m: AdjustMember) => void }) {
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<AdjustMember[]>([]);
  const [searching, setSearching] = React.useState(false);

  const term = query.trim();
  const open = term.length >= 2;

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const json = (await res.json().catch(() => ({}))) as { items?: AdjustMember[] };
        setOptions(Array.isArray(json.items) ? json.items : []);
      } catch {
        // Aborted by the next keystroke, or offline — keep the last list.
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div>
      <Label htmlFor="issue-member-search" required>
        Member
      </Label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input
          id="issue-member-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or referral code"
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-ink-200 bg-surface shadow-card">
          {searching && options.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-ink-500">
              <Spinner className="h-4 w-4 border-2" /> Searching…
            </p>
          ) : options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-500">No member matches “{term}”.</p>
          ) : (
            <ul className="max-h-64 divide-y divide-ink-100 overflow-y-auto">
              {options.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(m);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-50"
                  >
                    <Avatar src={m.avatarUrl} name={m.name} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {m.name}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
                        {m.email} · {m.referralCode}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-ink-700">
                      {formatPoints(m.balance)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
