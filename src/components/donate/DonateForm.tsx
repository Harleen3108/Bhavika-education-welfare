"use client";

import * as React from "react";
import { HeartHandshake, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select, FieldError } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { Hi } from "@/components/ui/Bilingual";
import { cn } from "@/lib/utils";

type Cause = { id: string; name: string; nameHi: string };

const PRESETS = [500, 1000, 2500, 5000];
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayInstance = { open: () => void };
type RazorpayCtor = new (opts: Record<string, unknown>) => RazorpayInstance;

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    const w = window as unknown as { Razorpay?: RazorpayCtor };
    if (w.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function DonateForm({ causes }: { causes: Cause[] }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [amount, setAmount] = React.useState<string>("1000");
  const [causeId, setCauseId] = React.useState(causes[0]?.id ?? "");
  const [pan, setPan] = React.useState("");
  const [anonymous, setAnonymous] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [done, setDone] = React.useState<{ receiptNo: string; url: string } | null>(null);

  const amt = Number(amount);
  const panUpper = pan.toUpperCase().trim();
  const ready =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    Number.isInteger(amt) &&
    amt >= 1 &&
    Boolean(causeId) &&
    (!panUpper || PAN_RE.test(panUpper));

  const donate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const createRes = await fetch("/api/donations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          amount: amt,
          categoryId: causeId,
          pan: panUpper,
          anonymous,
          message: message.trim(),
        }),
      });
      const created = (await createRes.json().catch(() => ({}))) as {
        donationId?: string;
        orderId?: string;
        amountPaise?: number;
        keyId?: string;
        donor?: { name: string; email: string; phone: string };
        error?: string;
        fields?: Record<string, string>;
      };
      if (!createRes.ok || !created.orderId) {
        if (created.fields) setFieldErrors(created.fields);
        setError(created.error || "We couldn't start the payment. Please try again.");
        setBusy(false);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        setError("Couldn't reach the payment gateway. Check your connection and try again.");
        setBusy(false);
        return;
      }

      const w = window as unknown as { Razorpay: RazorpayCtor };
      const rzp = new w.Razorpay({
        key: created.keyId,
        amount: created.amountPaise,
        currency: "INR",
        order_id: created.orderId,
        name: "Bhavika Education & Welfare Foundation",
        description: causes.find((c) => c.id === causeId)?.name ?? "Donation",
        prefill: { name: created.donor?.name, email: created.donor?.email, contact: created.donor?.phone },
        theme: { color: "#1d4e89" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (resp: RazorpayResponse) => {
          try {
            const vr = await fetch("/api/donations/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ donationId: created.donationId, ...resp }),
            });
            const vj = (await vr.json().catch(() => ({}))) as {
              receiptToken?: string;
              receiptNo?: string;
              error?: string;
            };
            if (!vr.ok || !vj.receiptToken) {
              setError(vj.error || "Payment received, but we couldn't confirm it. We'll email your receipt shortly.");
              return;
            }
            setDone({
              receiptNo: vj.receiptNo ?? "",
              url: `/api/donations/${created.donationId}/receipt?t=${vj.receiptToken}`,
            });
            toast.success("Thank you for your donation!");
          } finally {
            setBusy(false);
          }
        },
      });
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Alert tone="success">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 size={40} className="text-success" />
          <div>
            <p className="text-lg font-bold text-ink-900">Thank you for your generosity!</p>
            <Hi className="block text-brand-700">आपकी उदारता के लिए धन्यवाद!</Hi>
            {done.receiptNo && (
              <p className="mt-1 text-sm text-ink-600">Receipt No: {done.receiptNo}</p>
            )}
          </div>
          <a
            href={done.url}
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <Download size={16} /> Download receipt
          </a>
        </div>
      </Alert>
    );
  }

  return (
    <form onSubmit={donate} className="space-y-5" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}

      <div>
        <Label required>Amount (₹)</Label>
        <div className="mb-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                amt === p
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-ink-200 text-ink-600 hover:border-ink-300",
              )}
            >
              ₹{p.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={Boolean(fieldErrors.amount)}
        />
        <FieldError>{fieldErrors.amount}</FieldError>
      </div>

      <div>
        <Label htmlFor="d-cause" required>
          Cause
        </Label>
        <Select id="d-cause" value={causeId} onChange={(e) => setCauseId(e.target.value)}>
          {causes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="d-name" required>
            Full name
          </Label>
          <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(fieldErrors.name)} />
          <FieldError>{fieldErrors.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="d-email" required>
            Email
          </Label>
          <Input id="d-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(fieldErrors.email)} />
          <FieldError>{fieldErrors.email}</FieldError>
        </div>
        <div>
          <Label htmlFor="d-phone">Phone</Label>
          <Input id="d-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="d-pan">PAN (optional)</Label>
          <Input
            id="d-pan"
            value={pan}
            placeholder="ABCDE1234F"
            className="uppercase"
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            aria-invalid={Boolean(fieldErrors.pan)}
          />
          <p className="mt-1 text-xs text-ink-500">Add it to have your PAN on the receipt.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="d-message">Message (optional)</Label>
        <Textarea id="d-message" value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} className="min-h-16" />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="h-4 w-4 rounded border-ink-300"
        />
        Donate anonymously (Guptdan)
        <Hi inline className="text-ink-500">
          गुप्तदान
        </Hi>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <ShieldCheck size={14} className="shrink-0 text-accent-600" />
          Secure payment via Razorpay · receipt emailed instantly.
        </p>
        <Button type="submit" size="lg" loading={busy} disabled={!ready || causes.length === 0}>
          <HeartHandshake size={18} /> Donate ₹{Number.isFinite(amt) && amt > 0 ? amt.toLocaleString("en-IN") : ""}
        </Button>
      </div>
    </form>
  );
}
