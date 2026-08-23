"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Label, Select, FieldError } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { recordDonationAction } from "@/server/actions/donations";
import { DonationKind } from "@/lib/enums";
import { cn } from "@/lib/utils";

type Cause = { id: string; name: string };
type Kind = typeof DonationKind.DONATION | typeof DonationKind.VOLUNTEER;

export function RecordDonationButton({ causes }: { causes: Cause[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusCircle size={16} /> Record donation / volunteer
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record a donation or volunteer certificate">
        <RecordForm causes={causes} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function RecordForm({ causes, onDone }: { causes: Cause[]; onDone: () => void }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<Kind>(DonationKind.DONATION);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [causeId, setCauseId] = React.useState(causes[0]?.id ?? "");
  const [pan, setPan] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [anonymous, setAnonymous] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const isDonation = kind === DonationKind.DONATION;
  const ready =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    Boolean(causeId) &&
    (!isDonation || Number(amount) >= 1);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !ready) return;
    setSending(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await recordDonationAction({
        kind,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        amount: isDonation ? Number(amount) : 0,
        categoryId: causeId,
        pan: pan.toUpperCase().trim(),
        anonymous,
        message: message.trim(),
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setFormError(res.error);
        return;
      }
      toast.success(`Recorded — ${res.data?.receiptNo ?? ""}.`);
      router.refresh();
      onDone();
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            [DonationKind.DONATION, "Donation"],
            [DonationKind.VOLUNTEER, "Volunteer"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm font-semibold",
              kind === k ? "border-brand-400 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-600",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rd-name" required>
            Name
          </Label>
          <Input id="rd-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(fieldErrors.name)} />
          <FieldError>{fieldErrors.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="rd-email" required>
            Email
          </Label>
          <Input id="rd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(fieldErrors.email)} />
          <FieldError>{fieldErrors.email}</FieldError>
        </div>
        <div>
          <Label htmlFor="rd-phone">Phone</Label>
          <Input id="rd-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {isDonation && (
          <div>
            <Label htmlFor="rd-amount" required>
              Amount (₹)
            </Label>
            <Input id="rd-amount" type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={Boolean(fieldErrors.amount)} />
            <FieldError>{fieldErrors.amount}</FieldError>
          </div>
        )}
        <div>
          <Label htmlFor="rd-cause" required>
            {isDonation ? "Cause" : "Area of work"}
          </Label>
          <Select id="rd-cause" value={causeId} onChange={(e) => setCauseId(e.target.value)}>
            {causes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {isDonation && (
          <div>
            <Label htmlFor="rd-pan">PAN (optional)</Label>
            <Input id="rd-pan" value={pan} className="uppercase" onChange={(e) => setPan(e.target.value.toUpperCase())} />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="rd-message">{isDonation ? "Note (optional)" : "What they did"}</Label>
        <Textarea id="rd-message" value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} className="min-h-16" />
      </div>

      {isDonation && (
        <label className="flex items-center gap-2.5 text-sm text-ink-700">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4 rounded border-ink-300" />
          Anonymous (Guptdan)
        </label>
      )}

      <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
        <Button variant="subtle" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={sending} disabled={!ready}>
          {isDonation ? "Record donation" : "Issue certificate"}
        </Button>
      </div>
    </form>
  );
}
