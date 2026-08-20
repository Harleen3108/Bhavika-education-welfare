"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { captureGps, type GpsFix } from "@/lib/geolocate";
import { ArrowLeft, ArrowRight, LogIn, ShieldCheck } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { AccountStatus } from "@/lib/enums";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/States";
import { Hi } from "@/components/ui/Bilingual";
import { AuthField } from "./AuthCard";

type LoginError = {
  en: string;
  hi: string;
  /** When set, the alert offers a way to finish verifying this address. */
  verifyFor?: string;
};

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
  /*
    Same-site paths only. `callbackUrl` is whatever the address bar carries, so
    an absolute URL here would turn the login page into an open redirect: a link
    to /login?callbackUrl=https://evil.example lands the member on someone
    else's site the instant their password is accepted, with our toast on
    screen. A protocol-relative "//host" is an absolute URL too, hence the
    second test.
  */
  const requested = params.get("callbackUrl");
  const callbackUrl =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";
  const justVerified = params.get("verified") === "1";

  /*
    The verification flow appends the address it just verified so the member
    does not retype it. Shape-checked before it is trusted as a default: the
    parameter is public, and putting arbitrary text in the email field would
    only produce a validation error the member did not cause.
  */
  const prefillEmail = params.get("email") ?? "";
  const initialEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefillEmail) ? prefillEmail : "";

  const [formError, setFormError] = React.useState<LoginError | null>(null);

  // When the entered email belongs to an admin (and the password checks out),
  // we stay on this same page and reveal an extra "admin code" step.
  const [creds, setCreds] = React.useState<LoginInput | null>(null);
  const [adminCode, setAdminCode] = React.useState("");
  /*
    Captured once, when an email turns out to be an admin, and reused for the
    code step. Asking twice would show the browser's permission prompt twice in
    one sign-in, which reads as the site malfunctioning.
  */
  const [gps, setGps] = React.useState<GpsFix | null>(null);
  const [verifyingCode, setVerifyingCode] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: "" },
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
      /*
        Admin sign-in: ask the device where it is before verifying anything.
        Every attempt is logged with its position, so the fix has to be taken on
        the failing path too — capturing it only after a correct password would
        leave exactly the attempts worth investigating without a location.

        A refusal is recorded as a refusal, not treated as an error: the sign-in
        continues either way, and "permission denied" is itself a fact about the
        attempt.
      */
      const fix = await captureGps();
      setGps(fix);

      const pw = await postJson("/api/auth/admin/verify-password", {
        email: values.email,
        password: values.password,
        ...fix,
      });
      if (!pw.ok) {
        setFormError({
          en: "Invalid email or password.",
          hi: "ईमेल या पासवर्ड ग़लत है।",
        });
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
      // A rejected password comes back as a plain credentials error; anything
      // else means authorize threw, which here is a blocked or suspended
      // account (or, rarely, the database being unreachable).
      const rejected = res.error === "CredentialsSignin";
      setFormError(
        !rejected
          ? {
              en: "We couldn't sign you in. This account may be restricted — please contact us if it keeps happening.",
              hi: "हम आपको लॉग इन नहीं कर पाए। संभव है यह खाता प्रतिबंधित हो — दिक़्क़त बनी रहे तो हमसे संपर्क करें।",
            }
          : {
              en: "Invalid email or password.",
              hi: "ईमेल या पासवर्ड ग़लत है।",
              verifyFor: values.email,
            },
      );
      return;
    }

    // Signed in, but the mailbox was never confirmed — send them straight to
    // the code screen instead of a dashboard full of locked features.
    const session = await getSession();
    if (session?.user?.status === AccountStatus.PENDING) {
      toast.info("Almost there — verify your email to unlock quizzes.");
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
      router.refresh();
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
      adminCode: adminCode.trim(),
      ...(gps ?? {}),
      redirect: false,
    });
    setVerifyingCode(false);
    if (res?.error) {
      setFormError({ en: "That admin code is wrong.", hi: "एडमिन कोड ग़लत है।" });
      return;
    }
    finishLogin(true);
  };

  const errorAlert = formError && (
    <Alert tone="danger">
      {formError.en}
      <Hi className="mt-1 block">{formError.hi}</Hi>
      {formError.verifyFor && (
        <Link
          href={`/verify-email?email=${encodeURIComponent(formError.verifyFor)}`}
          className="mt-2 inline-flex items-center gap-1 font-semibold underline"
        >
          Registered but never verified? Enter your code
          <Hi inline>कोड डालें</Hi>
          <ArrowRight size={15} />
        </Link>
      )}
    </Alert>
  );

  // ---- Admin code step ----
  if (creds) {
    return (
      // Distinct key from the credentials form below. Without it React reuses
      // the same <input> DOM node across the two branches, and reusing this
      // controlled admin-code input as the uncontrolled email input (or back)
      // is what throws "changing a controlled input to be uncontrolled".
      <form key="admin-code-step" onSubmit={onSubmitCode} className="space-y-5" noValidate>
        <div className="flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <span>
            Admin account detected. Enter your admin access code to continue.
            <Hi className="mt-0.5 block">
              एडमिन खाता मिला। आगे बढ़ने के लिए एडमिन कोड भरें।
            </Hi>
          </span>
        </div>

        {errorAlert}

        <AuthField
          label="Admin access code"
          labelHi="एडमिन कोड"
          htmlFor="adminCode"
          required
          hint="The secret code issued to administrators."
          hintHi="प्रशासकों को दिया गया गुप्त कोड।"
        >
          <Input
            // Distinct key so React can never reconcile this controlled input
            // with the uncontrolled email input from the credentials step —
            // reusing that filled DOM node here is what corrupted the submitted
            // code and threw the controlled/uncontrolled warning.
            key="admin-access-code"
            id="adminCode"
            type="password"
            autoComplete="off"
            autoFocus
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
          />
        </AuthField>

        {/* Side by side the two pills need 343px, which the 280px card at 360px
            cannot give them — and neither can shrink, since Button is
            `whitespace-nowrap`. Stack them until there is room. `sm:flex-1`
            rather than `flex-1`: in column direction flex-basis would override
            the button's own height and collapse it. */}
        <div className="flex flex-col gap-3 sm:flex-row">
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
          <Button type="submit" size="lg" loading={verifyingCode} className="sm:flex-1">
            <ShieldCheck size={18} /> Access portal
          </Button>
        </div>
      </form>
    );
  }

  // ---- Email + password step (everyone) ----
  return (
    <form key="credentials-step" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {justVerified && !formError && (
        <Alert tone="success">
          Your email is verified. Log in to start earning points.
          <Hi className="mt-1 block">
            आपका ईमेल सत्यापित हो गया। पॉइंट्स कमाना शुरू करने के लिए लॉग इन करें।
          </Hi>
        </Alert>
      )}

      {errorAlert}

      <AuthField
        label="Email"
        labelHi="ईमेल"
        htmlFor="email"
        required
        error={errors.email?.message}
      >
        <Input
          key="login-email"
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
        action={
          <Link
            href="/forgot-password"
            className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-700"
          >
            Forgot?
          </Link>
        }
      >
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </AuthField>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        loading={isSubmitting}
        className="w-full"
      >
        {!isSubmitting && <LogIn size={18} />}
        Log in
        <Hi inline>लॉग इन करें</Hi>
      </Button>

      <p className="text-center text-sm text-ink-600">
        <Link href="/verify-email" className="font-medium text-brand-700 hover:text-brand-700">
          Need to verify your email?
        </Link>
        <Hi inline className="ml-1.5 text-ink-500">
          ईमेल सत्यापित करना है?
        </Hi>
      </p>
    </form>
  );
}
