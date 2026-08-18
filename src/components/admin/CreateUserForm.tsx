"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, MailCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/States";
import { adminCreateUserSchema, type AdminCreateUserInput } from "@/lib/validation/admin";

type CreateResponse = {
  id?: string;
  name?: string;
  email?: string;
  referralCode?: string;
  error?: string;
  code?: string;
  fields?: Record<string, string>;
};

type Created = { name: string; email: string; referralCode: string };

/**
 * Admin-created member.
 *
 * The account is born ACTIVE and already verified, so this form deliberately
 * has no "send verification" affordance to promise something that will not
 * happen. What it does promise is that the admin walks away with the two things
 * the new member needs: the password they just typed, and the referral code the
 * server minted — which is why the success state shows the code rather than
 * closing on a toast the admin may not read.
 */
export function CreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [created, setCreated] = React.useState<Created | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminCreateUserInput>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: { name: "", email: "", password: "", referralCode: "" },
  });

  const close = () => {
    setOpen(false);
    setCreated(null);
    setFormError(null);
    reset();
  };

  const startAnother = () => {
    setCreated(null);
    setFormError(null);
    reset();
  };

  const onSubmit = async (values: AdminCreateUserInput) => {
    setFormError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json().catch(() => ({}))) as CreateResponse;

      if (!res.ok) {
        if (json.fields) {
          for (const [field, message] of Object.entries(json.fields)) {
            setError(field as keyof AdminCreateUserInput, { message });
          }
        }
        // Both of these are about one field, so they belong on that field
        // rather than in a banner the admin has to map back to an input.
        if (json.code === "EMAIL_TAKEN") {
          setError("email", { message: json.error ?? "This email is already registered." });
          return;
        }
        if (json.code === "BAD_REFERRAL") {
          setError("referralCode", { message: json.error ?? "No member owns that code." });
          return;
        }
        setFormError(json.error || "Could not create the member.");
        return;
      }

      setCreated({
        name: json.name ?? values.name,
        email: json.email ?? values.email,
        referralCode: json.referralCode ?? "",
      });
      toast.success(`${json.name ?? values.name} can log in right away.`);
      router.refresh();
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus size={16} /> Add member
      </Button>

      <Modal open={open} onClose={close} title="Add a member">
        {created ? (
          <div className="space-y-4">
            <Alert tone="success" title={`${created.name} is ready to log in.`}>
              The account is active and already verified — no email was sent, and there is nothing
              for them to confirm.
            </Alert>

            <dl className="space-y-3 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Email</dt>
                <dd className="min-w-0 truncate font-medium text-ink-900">{created.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Referral code</dt>
                <dd className="flex items-center gap-2">
                  <span className="rounded-lg bg-surface px-2.5 py-1 font-mono text-sm font-semibold tracking-wider text-brand-700 ring-1 ring-ink-200">
                    {created.referralCode || "—"}
                  </span>
                  {created.referralCode && <CopyCode code={created.referralCode} />}
                </dd>
              </div>
            </dl>

            <p className="text-sm text-ink-500">
              Pass on the password you set — it is not stored anywhere readable and cannot be shown
              again.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="subtle" onClick={startAnother}>
                Add another
              </Button>
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Alert tone="info">
              <span className="flex items-start gap-2">
                <MailCheck size={16} className="mt-0.5 shrink-0" />
                Created active and pre-verified. No verification email is sent — use this for members
                you have signed up in person.
              </span>
            </Alert>

            {formError && <Alert tone="danger">{formError}</Alert>}

            <FormField label="Full name" htmlFor="new-name" required error={errors.name?.message}>
              <Input
                id="new-name"
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>

            <FormField label="Email" htmlFor="new-email" required error={errors.email?.message}>
              <Input
                id="new-email"
                type="email"
                autoComplete="off"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="new-password"
              required
              error={errors.password?.message}
              hint="At least 8 characters, with a letter and a number. Share it with the member."
            >
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </FormField>

            <FormField
              label="Referral code used"
              htmlFor="new-referral"
              error={errors.referralCode?.message}
              hint="Optional — the code of the member who introduced them."
            >
              <Input
                id="new-referral"
                placeholder="e.g. ABCD2345"
                className="uppercase"
                autoComplete="off"
                aria-invalid={Boolean(errors.referralCode)}
                {...register("referralCode")}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Create member
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — select the code and copy it manually.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg p-1.5 text-ink-500 hover:bg-surface hover:text-brand-700"
      aria-label={copied ? "Copied" : "Copy referral code"}
    >
      {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
    </button>
  );
}
