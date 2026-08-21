"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { ImageUploader } from "@/components/admin/ImageUploader";
import type { AdjustMember } from "@/components/admin/WalletAdjustForm";
import { adminIssueIdCardAction } from "@/server/actions/idcards";

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Admin issues an approved ID card on a member's behalf.
 *
 * For a member who can't complete the form themselves. The photo is optional —
 * if left blank the member's existing avatar is used; if supplied it is also
 * saved to their profile.
 */
export function IssueIdCardForm({ onIssued }: { onIssued?: () => void }) {
  const router = useRouter();
  const [member, setMember] = React.useState<AdjustMember | null>(null);
  const [fatherName, setFatherName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [aadhaar, setAadhaar] = React.useState("");
  const [pan, setPan] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const aadhaarDigits = aadhaar.replace(/\D/g, "");
  const panUpper = pan.toUpperCase().trim();
  const ready =
    Boolean(member) &&
    fatherName.trim().length >= 2 &&
    address.trim().length >= 5 &&
    aadhaarDigits.length === 12 &&
    PAN_RE.test(panUpper);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !member || !ready) return;
    setSending(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await adminIssueIdCardAction({
        userId: member.id,
        fatherName: fatherName.trim(),
        address: address.trim(),
        aadhaar: aadhaarDigits,
        pan: panUpper,
        photoUrl: photoUrl || "",
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setFormError(res.error);
        return;
      }
      toast.success(`ID card issued — ${res.data?.memberId ?? ""}.`);
      router.refresh();
      onIssued?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      {member ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
          <Avatar src={member.avatarUrl} name={member.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink-900">{member.name}</p>
            <p className="truncate text-sm text-ink-600">{member.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setMember(null)}
            className="shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-white hover:text-danger"
            aria-label="Choose a different member"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <MemberPicker onPick={setMember} />
      )}

      <fieldset disabled={!member} className="space-y-5 disabled:opacity-50">
        <ImageUploader
          value={photoUrl}
          onChange={setPhotoUrl}
          label="Photo (optional — uses their profile photo if left blank)"
        />

        <div>
          <Label htmlFor="iss-father" required>
            Father&apos;s name
          </Label>
          <Input
            id="iss-father"
            value={fatherName}
            maxLength={120}
            onChange={(e) => setFatherName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.fatherName)}
          />
          <FieldError>{fieldErrors.fatherName}</FieldError>
        </div>

        <div>
          <Label htmlFor="iss-address" required>
            Address
          </Label>
          <Textarea
            id="iss-address"
            value={address}
            maxLength={300}
            onChange={(e) => setAddress(e.target.value)}
            aria-invalid={Boolean(fieldErrors.address)}
            className="min-h-20"
          />
          <FieldError>{fieldErrors.address}</FieldError>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="iss-aadhaar" required>
              Aadhaar number
            </Label>
            <Input
              id="iss-aadhaar"
              inputMode="numeric"
              value={aadhaar}
              placeholder="12 digits"
              onChange={(e) => setAadhaar(e.target.value)}
              aria-invalid={Boolean(fieldErrors.aadhaar)}
            />
            <FieldError>{fieldErrors.aadhaar}</FieldError>
          </div>
          <div>
            <Label htmlFor="iss-pan" required>
              PAN
            </Label>
            <Input
              id="iss-pan"
              value={pan}
              placeholder="ABCDE1234F"
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              aria-invalid={Boolean(fieldErrors.pan)}
              className="uppercase"
            />
            <FieldError>{fieldErrors.pan}</FieldError>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <ShieldCheck size={14} className="shrink-0 text-accent-600" />
          Issues an approved card immediately and emails the member.
        </p>
        <Button type="submit" loading={sending} disabled={!ready}>
          {sending ? "Issuing…" : "Issue ID card"}
        </Button>
      </div>
    </form>
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
      <Label htmlFor="iss-member" required>
        Member
      </Label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input
          id="iss-member"
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
