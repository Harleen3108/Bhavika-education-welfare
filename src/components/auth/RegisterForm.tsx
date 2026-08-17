"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/States";
import { Hi } from "@/components/ui/Bilingual";
import { AuthField } from "./AuthCard";
import { VerifyOtpForm } from "./VerifyOtpForm";

type Pending = { email: string; resent: boolean };

export function RegisterForm() {
  const params = useSearchParams();
  const refFromUrl = (params.get("ref") || "").toUpperCase();

  // Set once the account exists — the form swaps to code entry in place rather
  // than sending the user off to read a "check your inbox" dead end.
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [formError, setFormError] = React.useState<React.ReactNode>(null);

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
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        email?: string;
        resent?: boolean;
        error?: string;
        code?: string;
        fields?: Record<string, string>;
      };

      if (!res.ok) {
        if (json.fields) {
          for (const [field, message] of Object.entries(json.fields)) {
            setError(field as keyof RegisterInput, { message });
          }
        }
        // The only conflict left is a real, already-active account: an
        // unverified one is re-sent a code instead of being rejected.
        if (res.status === 409) {
          setFormError(
            <>
              This email already has an active account.{" "}
              <Link href="/login" className="font-semibold underline">
                Log in
              </Link>{" "}
              or{" "}
              <Link href="/forgot-password" className="font-semibold underline">
                reset your password
              </Link>
              .
              <Hi className="mt-1 block">
                इस ईमेल से खाता पहले से चालू है। लॉग इन करें या पासवर्ड रीसेट करें।
              </Hi>
            </>,
          );
          return;
        }
        setFormError(json.error || "Could not create your account. Please try again.");
        return;
      }

      setPending({ email: json.email ?? values.email, resent: !!json.resent });
      toast.success(
        json.resent ? "We've sent you a fresh code." : "Account created — check your email.",
      );
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    }
  };

  if (pending) {
    return (
      <VerifyOtpForm
        showHeader
        lockEmail
        email={pending.email}
        notice={pending.resent ? "resent" : "created"}
        // The code was emailed a moment ago; make them wait before asking again.
        initialCooldown={60}
        onChangeEmail={() => setPending(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      <AuthField
        label="Full name"
        labelHi="पूरा नाम"
        htmlFor="name"
        required
        error={errors.name?.message}
      >
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
      </AuthField>

      <AuthField
        label="Email"
        labelHi="ईमेल"
        htmlFor="email"
        required
        error={errors.email?.message}
        hint="We send your verification code here."
        hintHi="सत्यापन कोड इसी पर आएगा।"
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </AuthField>

      <AuthField
        label="Password"
        labelHi="पासवर्ड"
        htmlFor="password"
        required
        error={errors.password?.message}
        hint="At least 8 characters, with a letter and a number."
        hintHi="कम से कम 8 अक्षर, एक अक्षर और एक अंक ज़रूरी।"
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </AuthField>

      <AuthField
        label="Confirm password"
        labelHi="पासवर्ड दोबारा"
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
      </AuthField>

      <AuthField
        label="Referral code"
        labelHi="रेफ़रल कोड"
        htmlFor="referralCode"
        error={errors.referralCode?.message}
        hint="Optional — a friend's code earns you both points."
        hintHi="वैकल्पिक — दोस्त का कोड दोनों को पॉइंट्स दिलाता है।"
      >
        <Input
          id="referralCode"
          placeholder="e.g. ABCD2345"
          className="uppercase"
          aria-invalid={!!errors.referralCode}
          {...register("referralCode")}
        />
      </AuthField>

      <label className="flex items-start gap-2.5 text-sm text-ink-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
          {...register("acceptTerms")}
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="text-brand-700 underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="text-brand-700 underline">
            Privacy Policy
          </Link>
          .
          <Hi className="mt-0.5 block text-ink-500">
            मैं नियम और गोपनीयता नीति से सहमत हूँ।
          </Hi>
        </span>
      </label>
      {errors.acceptTerms && (
        <p className="text-sm text-danger" role="alert">
          {errors.acceptTerms.message}
        </p>
      )}

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        loading={isSubmitting}
        // Button carries `whitespace-nowrap` and a fixed `h-13`, and this label
        // — icon + English + Hindi — measures 347px. The auth card is 280px
        // wide at 360px, so the words spilled outside the pill and were then
        // clipped by the card. Let the label wrap and the pill grow with it;
        // one line still costs 49.6px, under `min-h-13`, so nothing moves once
        // the card is wide enough to hold it on a single line.
        className="h-auto min-h-13 w-full py-3 whitespace-normal"
      >
        {!isSubmitting && <Sparkles size={18} />}
        Create my free account
        <Hi inline>खाता बनाएँ</Hi>
      </Button>

      <p className="text-center text-xs text-ink-500">
        Takes under a minute. No fees, ever.
        <Hi inline className="ml-1.5">
          एक मिनट से भी कम। कोई शुल्क नहीं।
        </Hi>
      </p>
    </form>
  );
}
