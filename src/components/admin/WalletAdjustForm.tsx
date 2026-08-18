"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowUpRight, ArrowDownRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { TransactionType } from "@/lib/enums";
import { cn, formatPoints } from "@/lib/utils";

export type AdjustMember = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  status: string;
  avatarUrl: string;
  balance: number;
};

type Direction = typeof TransactionType.CREDIT | typeof TransactionType.DEBIT;

type AdjustResponse = {
  applied?: boolean;
  balance?: number;
  transactionId?: string;
  member?: { id: string; name: string };
  error?: string;
  code?: string;
  fields?: Record<string, string>;
};

type Outcome = {
  applied: boolean;
  balance: number;
  memberName: string;
  points: number;
  direction: Direction;
  description: string;
};

const MAX_DESCRIPTION = 300;

/**
 * A request id the ledger can key on. `randomUUID` is unavailable outside a
 * secure context, so the fallback still produces something the server's
 * `^[A-Za-z0-9_-]{16,64}$` guard accepts rather than failing validation on
 * whichever machine the admin happens to be using.
 */
function mintRequestId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Manual point adjustment.
 *
 * The server is already exactly-once — it turns the `requestId` this form mints
 * into the ledger's unique idempotency key — but a UI that lets an admin click
 * "Apply" twice and shows nothing in between is still a UI that invites the
 * mistake. So: the button is disabled while a request is in flight, and the
 * outcome is stated in words ("applied" vs "already applied") rather than left
 * for the admin to infer from a balance that may not have moved.
 *
 * Pass `member` to pin the form to one person (the user detail page); omit it
 * to get the search picker (the wallet page).
 */
export function WalletAdjustForm({
  member: preset,
  onApplied,
}: {
  member?: AdjustMember | null;
  onApplied?: () => void;
}) {
  const router = useRouter();

  const [picked, setPicked] = React.useState<AdjustMember | null>(null);
  const member = preset ?? picked;

  const [direction, setDirection] = React.useState<Direction>(TransactionType.CREDIT);
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [sending, setSending] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);

  /*
    One request id per economic event, held across retries of that same event.

    A retry after a timeout must carry the id the first attempt used — that is
    what lets the server recognise it as the same adjustment instead of a second
    one. But the moment the admin edits any field it is no longer the same
    adjustment, so the id is keyed on the payload and re-minted when the payload
    changes. Cleared on success, so the next adjustment starts fresh.
  */
  const attemptRef = React.useRef<{ key: string; id: string } | null>(null);

  const points = Number(amount);
  const validPoints = Number.isInteger(points) && points >= 1 && points <= 100000;
  const isDebit = direction === TransactionType.DEBIT;
  const overdrawn = Boolean(member) && isDebit && validPoints && points > (member?.balance ?? 0);
  const ready = Boolean(member) && validPoints && description.trim().length >= 3 && !overdrawn;

  const reset = () => {
    setAmount("");
    setDescription("");
    setFormError(null);
    setFieldErrors({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !member || !ready) return;

    const payload = {
      userId: member.id,
      direction,
      points,
      description: description.trim(),
    };
    const key = JSON.stringify(payload);
    if (attemptRef.current?.key !== key) {
      attemptRef.current = { key, id: mintRequestId() };
    }

    setSending(true);
    setFormError(null);
    setFieldErrors({});
    setOutcome(null);

    try {
      const res = await fetch("/api/admin/wallet/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestId: attemptRef.current.id }),
      });
      const json = (await res.json().catch(() => ({}))) as AdjustResponse;

      if (!res.ok) {
        if (json.fields) setFieldErrors(json.fields);
        setFormError(json.error || "The adjustment could not be applied.");
        return;
      }

      // Applied — the next adjustment is a different economic event.
      attemptRef.current = null;
      setOutcome({
        applied: json.applied !== false,
        balance: json.balance ?? 0,
        memberName: json.member?.name ?? member.name,
        points,
        direction,
        description: payload.description,
      });
      setAmount("");
      setDescription("");
      toast.success(
        json.applied === false
          ? "Already applied — nothing was charged twice."
          : `${isDebit ? "Deducted" : "Credited"} ${points} points.`,
      );
      router.refresh();
      onApplied?.();
    } catch {
      setFormError(
        "Network error, so we cannot tell whether it reached the server. Press Apply again on this same form — it carries a one-time key, so a retry can never charge twice.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {outcome && <OutcomeAlert {...outcome} onDismiss={() => setOutcome(null)} />}
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
            onClick={() => {
              setPicked(null);
              reset();
            }}
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
          <Label>Direction</Label>
          <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-2">
            <DirectionOption
              value={TransactionType.CREDIT}
              current={direction}
              onSelect={setDirection}
              icon={<ArrowUpRight size={18} />}
              label="Credit"
              hint="Add points"
            />
            <DirectionOption
              value={TransactionType.DEBIT}
              current={direction}
              onSelect={setDirection}
              icon={<ArrowDownRight size={18} />}
              label="Debit"
              hint="Take points back"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="adjust-points" required>
            Points
          </Label>
          <Input
            id="adjust-points"
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            step={1}
            value={amount}
            placeholder="e.g. 250"
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(fieldErrors.points) || overdrawn}
          />
          <FieldError>{fieldErrors.points}</FieldError>
          {overdrawn && member && (
            <p className="mt-1.5 text-sm text-danger" role="alert">
              {member.name} holds {formatPoints(member.balance)} points — a deduction of{" "}
              {formatPoints(points)} would go below zero.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="adjust-description" required>
            Description
          </Label>
          <Textarea
            id="adjust-description"
            value={description}
            maxLength={MAX_DESCRIPTION}
            placeholder="e.g. Volunteer bonus for the August health camp"
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={Boolean(fieldErrors.description)}
            className="min-h-20"
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <p className="text-sm text-ink-500">
              The member reads this in their own wallet history.
            </p>
            <span className="shrink-0 text-xs tabular-nums text-ink-400">
              {description.length}/{MAX_DESCRIPTION}
            </span>
          </div>
          <FieldError>{fieldErrors.description}</FieldError>
        </div>

        {description.trim().length >= 3 && (
          <MemberPreview direction={direction} description={description.trim()} />
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <ShieldCheck size={14} className="shrink-0 text-accent-600" />
          Audited and reversible only by a matching adjustment.
        </p>
        <Button type="submit" loading={sending} disabled={!ready}>
          {sending ? "Applying…" : isDebit ? "Apply deduction" : "Apply credit"}
        </Button>
      </div>
    </form>
  );
}

function DirectionOption({
  value,
  current,
  onSelect,
  icon,
  label,
  hint,
}: {
  value: Direction;
  current: Direction;
  onSelect: (d: Direction) => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  const active = current === value;
  const credit = value === TransactionType.CREDIT;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(value)}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        active
          ? credit
            ? "border-green-400 bg-green-50 text-green-800"
            : "border-red-400 bg-red-50 text-red-800"
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

/**
 * Exactly the line the ledger will store, so the admin can see the wording the
 * member will read before committing to it. The prefix mirrors the one built in
 * `/api/admin/wallet/adjust` — if that wording changes, change it here too.
 */
function MemberPreview({ direction, description }: { direction: Direction; description: string }) {
  const credit = direction === TransactionType.CREDIT;
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50/60 p-3">
      <p className="type-label mb-2 text-ink-500">What the member will see</p>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            credit ? "bg-green-50 text-success" : "bg-red-50 text-danger",
          )}
        >
          {credit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-800">
            {credit ? "Credited by admin" : "Deducted by admin"} — {description}
          </p>
          <Badge tone="warning" className="mt-1">
            Adjustment
          </Badge>
        </div>
      </div>
    </div>
  );
}

function OutcomeAlert({
  applied,
  balance,
  memberName,
  points,
  direction,
  description,
  onDismiss,
}: Outcome & { onDismiss: () => void }) {
  const credit = direction === TransactionType.CREDIT;
  return (
    <Alert tone={applied ? "success" : "warning"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {applied
              ? `${credit ? "Credited" : "Deducted"} ${formatPoints(points)} points ${
                  credit ? "to" : "from"
                } ${memberName}.`
              : "Already applied — this exact adjustment was recorded earlier and was not repeated."}
          </p>
          <p className="mt-1">
            New balance: <span className="font-semibold">{formatPoints(balance)} points</span>
          </p>
          <p className="mt-1 opacity-80">
            {credit ? "Credited by admin" : "Deducted by admin"} — {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1 hover:bg-black/5"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </Alert>
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
        // Aborted by the next keystroke, or offline — keep the last list rather
        // than blanking the dropdown under the admin's cursor.
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
      <Label htmlFor="member-search" required>
        Member
      </Label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input
          id="member-search"
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
