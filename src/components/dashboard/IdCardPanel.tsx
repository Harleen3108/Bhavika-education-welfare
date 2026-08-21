"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, ShieldCheck, Clock, XCircle, IdCard as IdCardIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { Hi } from "@/components/ui/Bilingual";
import { AvatarUploader } from "@/components/dashboard/AvatarUploader";
import { IdCardStatus } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

/* Local type — the server DTO shape, kept structural so the service stays the
   single source of truth without importing a server-only module. */
type Card = {
  id: string;
  status: string;
  memberId: string | null;
  fullName: string;
  fatherName: string;
  address: string;
  city: string;
  photoUrl: string;
  aadhaarMasked: string;
  panMasked: string;
  rejectionReason: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  canDownload: boolean;
};

type Fields = { fatherName: string; address: string; aadhaar: string; pan: string };

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function IdCardPanel({
  card,
  name,
  avatarUrl,
}: {
  card: Card | null;
  name: string;
  avatarUrl: string;
}) {
  const approved = card?.status === IdCardStatus.APPROVED;
  const pending = card?.status === IdCardStatus.PENDING;

  if (approved && card) return <ApprovedCard card={card} />;

  return (
    <div className="space-y-6">
      {pending && (
        <Alert tone="warning">
          <span className="inline-flex items-center gap-2 font-semibold">
            <Clock size={16} /> Your ID card request is under review.
          </span>
          <Hi className="mt-1 block">आपका पहचान पत्र अनुरोध समीक्षा में है।</Hi>
          <p className="mt-1 text-sm">
            An admin will verify your details. You&apos;ll get an email the moment it&apos;s approved.
          </p>
        </Alert>
      )}

      {card?.status === IdCardStatus.REJECTED && (
        <Alert tone="danger">
          <span className="inline-flex items-center gap-2 font-semibold">
            <XCircle size={16} /> Your request needs changes.
          </span>
          {card.rejectionReason && <p className="mt-1 text-sm">{card.rejectionReason}</p>}
          <p className="mt-1 text-sm">Please correct the details below and submit again.</p>
        </Alert>
      )}

      {!pending && <KycForm card={card} name={name} avatarUrl={avatarUrl} />}
    </div>
  );
}

/* -------------------------------- Approved -------------------------------- */

function ApprovedCard({ card }: { card: Card }) {
  return (
    <div className="space-y-5">
      <Alert tone="success">
        <span className="inline-flex items-center gap-2 font-semibold">
          <ShieldCheck size={16} /> Your ID card is approved and ready.
        </span>
        <Hi className="mt-1 block">आपका पहचान पत्र स्वीकृत और तैयार है।</Hi>
      </Alert>

      <Card>
        <CardBody className="p-5">
          <div className="flex items-center gap-4">
            <Avatar src={card.photoUrl} name={card.fullName} size={72} />
            <div className="min-w-0">
              <p className="type-label text-brand-700">{card.memberId}</p>
              <p className="truncate text-lg font-bold text-ink-900">{card.fullName}</p>
              <p className="truncate text-sm text-ink-500">{card.city || "—"}</p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 border-t border-ink-100 pt-4 text-sm sm:grid-cols-2">
            <Detail label="Father's name">{card.fatherName}</Detail>
            <Detail label="Valid until">
              {card.expiresAt ? formatDate(card.expiresAt) : "—"}
            </Detail>
            <Detail label="Aadhaar">{card.aadhaarMasked}</Detail>
            <Detail label="PAN">{card.panMasked}</Detail>
            <Detail label="Address" className="sm:col-span-2">
              {card.address}
            </Detail>
          </dl>

          <a
            href={`/api/idcard/${card.id}/download`}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            <Download size={18} /> Download ID card (PDF)
            <Hi inline>पहचान पत्र डाउनलोड करें</Hi>
          </a>
        </CardBody>
      </Card>
    </div>
  );
}

function Detail({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink-800">{children}</dd>
    </div>
  );
}

/* ---------------------------------- Form ---------------------------------- */

function KycForm({
  card,
  name,
  avatarUrl,
}: {
  card: Card | null;
  name: string;
  avatarUrl: string;
}) {
  const router = useRouter();
  const [fields, setFields] = React.useState<Fields>({
    fatherName: card?.fatherName ?? "",
    address: card?.address ?? "",
    aadhaar: "",
    pan: "",
  });
  const [sending, setSending] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const set = (k: keyof Fields, v: string) => setFields((f) => ({ ...f, [k]: v }));

  const aadhaarDigits = fields.aadhaar.replace(/\D/g, "");
  const panUpper = fields.pan.toUpperCase().trim();
  const ready =
    fields.fatherName.trim().length >= 2 &&
    fields.address.trim().length >= 5 &&
    aadhaarDigits.length === 12 &&
    PAN_RE.test(panUpper);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !ready) return;
    if (!avatarUrl) {
      setFormError("Please add a profile photo above — it becomes the photo on your ID card.");
      return;
    }
    setSending(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/user/idcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fatherName: fields.fatherName.trim(),
          address: fields.address.trim(),
          aadhaar: aadhaarDigits,
          pan: panUpper,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
      };
      if (!res.ok) {
        if (json.fields) setFieldErrors(json.fields);
        setFormError(json.error || "We couldn't submit your request. Please try again.");
        return;
      }
      toast.success("ID card request submitted for review.");
      router.refresh();
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardBody className="space-y-6">
        <div className="flex items-start gap-3">
          <IdCardIcon className="mt-0.5 shrink-0 text-brand-600" size={22} />
          <div>
            <h2 className="font-semibold text-ink-900">Apply for your ID card</h2>
            <Hi className="block text-brand-700">अपने पहचान पत्र के लिए आवेदन करें</Hi>
            <p className="mt-1 text-sm text-ink-600">
              Your Aadhaar and PAN are encrypted and used only to verify you — they are never
              printed on the card.
            </p>
            <Hi className="mt-0.5 block text-sm text-ink-600">
              आपका आधार और पैन सुरक्षित रखा जाता है और केवल पहचान की पुष्टि के लिए इस्तेमाल होता है।
            </Hi>
          </div>
        </div>

        {/* The photo IS the profile avatar, so it saves on its own. */}
        <AvatarUploader value={avatarUrl} name={name} />

        <form onSubmit={submit} className="space-y-5" noValidate>
          {formError && <Alert tone="danger">{formError}</Alert>}

          <div>
            <Label htmlFor="idc-father" required>
              Father&apos;s name
            </Label>
            <Input
              id="idc-father"
              value={fields.fatherName}
              maxLength={120}
              placeholder="e.g. Ram Kumar"
              onChange={(e) => set("fatherName", e.target.value)}
              aria-invalid={Boolean(fieldErrors.fatherName)}
            />
            <FieldError>{fieldErrors.fatherName}</FieldError>
          </div>

          <div>
            <Label htmlFor="idc-address" required>
              Address
            </Label>
            <Textarea
              id="idc-address"
              value={fields.address}
              maxLength={300}
              placeholder="House / street, area, city, PIN"
              onChange={(e) => set("address", e.target.value)}
              aria-invalid={Boolean(fieldErrors.address)}
              className="min-h-20"
            />
            <FieldError>{fieldErrors.address}</FieldError>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="idc-aadhaar" required>
                Aadhaar number
              </Label>
              <Input
                id="idc-aadhaar"
                inputMode="numeric"
                value={fields.aadhaar}
                placeholder="12 digits"
                onChange={(e) => set("aadhaar", e.target.value)}
                aria-invalid={Boolean(fieldErrors.aadhaar)}
              />
              <FieldError>{fieldErrors.aadhaar}</FieldError>
            </div>
            <div>
              <Label htmlFor="idc-pan" required>
                PAN
              </Label>
              <Input
                id="idc-pan"
                value={fields.pan}
                placeholder="ABCDE1234F"
                onChange={(e) => set("pan", e.target.value.toUpperCase())}
                aria-invalid={Boolean(fieldErrors.pan)}
                className="uppercase"
              />
              <FieldError>{fieldErrors.pan}</FieldError>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
            <p className="flex items-center gap-1.5 text-xs text-ink-500">
              <ShieldCheck size={14} className="shrink-0 text-accent-600" />
              Encrypted · reviewed by an admin before your card is issued.
            </p>
            <Button type="submit" loading={sending} disabled={!ready}>
              {card?.status === IdCardStatus.REJECTED ? "Resubmit" : "Submit request"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
