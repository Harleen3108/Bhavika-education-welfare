"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/States";

export function RegisterForm() {
  const params = useSearchParams();
  const refFromUrl = (params.get("ref") || "").toUpperCase();
  const [done, setDone] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      referralCode: refFromUrl,
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.fields) {
          for (const [k, v] of Object.entries(json.fields)) {
            setError(k as keyof RegisterInput, { message: String(v) });
          }
        }
        setFormError(json.error || "Could not create your account. Please try again.");
        return;
      }
      setDone(true);
      toast.success("Account created! Check your email.");
    } catch {
      setFormError("Network error. Please try again.");
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-green-200 bg-green-50 px-6 py-10 text-center">
        <MailCheck className="text-[--color-success]" size={44} />
        <h3 className="mt-4 text-lg font-semibold text-brand-800">Check your inbox</h3>
        <p className="mt-2 text-sm text-ink-600">
          We&apos;ve sent a verification link to your email. Click it to activate your account
          and start earning points.
        </p>
        <a href="/login" className="mt-5 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Go to login →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
      </FormField>

      <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        required
        error={errors.password?.message}
        hint="At least 8 characters, with a letter and a number."
      >
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
      </FormField>

      <FormField label="Confirm password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
      </FormField>

      <FormField label="Referral code (optional)" htmlFor="referralCode" error={errors.referralCode?.message}>
        <Input
          id="referralCode"
          placeholder="e.g. ABCD2345"
          className="uppercase"
          aria-invalid={!!errors.referralCode}
          {...register("referralCode")}
        />
      </FormField>

      <label className="flex items-start gap-2.5 text-sm text-ink-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          {...register("acceptTerms")}
        />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" className="text-brand-600 underline">Terms</a> and{" "}
          <a href="/privacy" target="_blank" className="text-brand-600 underline">Privacy Policy</a>.
        </span>
      </label>
      {errors.acceptTerms && (
        <p className="text-sm text-[--color-danger]">{errors.acceptTerms.message}</p>
      )}

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Create account
      </Button>
    </form>
  );
}
