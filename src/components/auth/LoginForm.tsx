"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/States";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status };
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [formError, setFormError] = React.useState<string | null>(null);

  // When the entered email belongs to an admin (and the password checks out),
  // we stay on this same page and reveal an extra "admin code" step.
  const [creds, setCreds] = React.useState<LoginInput | null>(null);
  const [adminCode, setAdminCode] = React.useState("");
  const [verifyingCode, setVerifyingCode] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const finishLogin = (isAdmin: boolean) => {
    toast.success("Welcome back!");
    router.push(isAdmin ? "/admin" : callbackUrl);
    router.refresh();
  };

  // Step 1: email + password. Admins branch to the code step; members sign in.
  const onSubmit = async (values: LoginInput) => {
    setFormError(null);

    // Detect whether this email is an admin account.
    const lookup = await postJson("/api/auth/admin/lookup", { email: values.email });

    if (lookup.ok) {
      // Admin — verify the password before asking for the access code.
      const pw = await postJson("/api/auth/admin/verify-password", {
        email: values.email,
        password: values.password,
      });
      if (!pw.ok) {
        setFormError("Invalid email or password.");
        return;
      }
      setCreds(values);
      setAdminCode("");
      return;
    }

    // Regular member — sign in directly.
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (res?.error) {
      setFormError(
        "Invalid email or password. If your account is new, please verify your email; if it's restricted, contact us.",
      );
      return;
    }
    finishLogin(false);
  };

  // Step 2 (admins only): admin access code.
  const onSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creds) return;
    setFormError(null);
    setVerifyingCode(true);
    const res = await signIn("credentials", {
      email: creds.email,
      password: creds.password,
      adminCode,
      redirect: false,
    });
    setVerifyingCode(false);
    if (res?.error) {
      setFormError("Admin code is wrong.");
      return;
    }
    finishLogin(true);
  };

  // ---- Admin code step ----
  if (creds) {
    return (
      <form onSubmit={onSubmitCode} className="space-y-5" noValidate>
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <ShieldCheck size={18} className="shrink-0" />
          <span>
            Admin account detected. Enter your admin access code to continue.
          </span>
        </div>

        {formError && <Alert tone="danger">{formError}</Alert>}

        <FormField
          label="Admin access code"
          htmlFor="adminCode"
          required
          hint="The secret code issued to administrators."
        >
          <Input
            id="adminCode"
            type="password"
            autoComplete="one-time-code"
            autoFocus
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
          />
        </FormField>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="subtle"
            size="lg"
            onClick={() => {
              setCreds(null);
              setFormError(null);
            }}
          >
            <ArrowLeft size={18} /> Back
          </Button>
          <Button type="submit" size="lg" loading={verifyingCode} className="flex-1">
            <ShieldCheck size={18} /> Access portal
          </Button>
        </div>
      </form>
    );
  }

  // ---- Email + password step (everyone) ----
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </FormField>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-ink-800">
            Password <span className="text-[--color-danger]">*</span>
          </label>
          <a href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Forgot?
          </a>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1.5 text-sm text-[--color-danger]">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Log in
      </Button>
    </form>
  );
}
