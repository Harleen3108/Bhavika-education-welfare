"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";

export function ForgotPasswordForm() {
  const [done, setDone] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setFormError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok && res.status !== 200) {
        const json = await res.json().catch(() => ({}));
        setFormError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setFormError("Network error. Please try again.");
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-green-200 bg-green-50 px-6 py-10 text-center">
        <MailCheck className="text-[--color-success]" size={44} />
        <h3 className="mt-4 text-lg font-semibold text-brand-800">Check your email</h3>
        <p className="mt-2 text-sm text-ink-600">
          If an account exists for that address, we&apos;ve sent a password reset link.
        </p>
        <a href="/login" className="mt-5 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to login →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}
      <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </FormField>
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
