"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { Hi } from "@/components/ui/Bilingual";
import { resendVerificationSchema, verifyOtpSchema } from "@/lib/validation/auth";
import { AuthField } from "./AuthCard";
import { OtpInput, type OtpInputHandle } from "./OtpInput";

const RESEND_COOLDOWN_SECONDS = 60;

type Failure = { en: string; hi: string; locked?: boolean };

/**
 * One entry per rejection the API can return. `locked` means the code itself is
 * finished — retyping it can only fail again, so the UI points at "resend"
 * instead of at the boxes.
 */
const FAILURES: Record<string, Failure> = {
  BAD_OTP: {
    en: "That code doesn't match. Check the six digits and try again.",
    hi: "यह कोड सही नहीं है। छह अंक दोबारा देखकर भरें।",
  },
  OTP_EXPIRED: {
    en: "This code has expired. Send a fresh one below.",
    hi: "यह कोड समाप्त हो चुका है। नीचे से नया कोड भेजें।",
    locked: true,
  },
  TOO_MANY_ATTEMPTS: {
    en: "Too many wrong tries, so this code is closed. Request a new one.",
    hi: "बहुत बार ग़लत कोड डाला गया, इसलिए यह कोड बंद हो गया। नया कोड मंगाएँ।",
    locked: true,
  },
  RATE_LIMITED: {
    en: "Too many attempts from this device. Wait a few minutes and try again.",
    hi: "इस डिवाइस से बहुत कोशिशें हो चुकी हैं। कुछ मिनट रुककर फिर कोशिश करें।",
  },
  UNKNOWN: {
    en: "We couldn't check that code just now. Please try again.",
    hi: "अभी कोड जाँच नहीं पाए। कृपया दोबारा कोशिश करें।",
  },
};

/**
 * What just happened, for the flows that arrive mid-story. One line each: the
 * address, the boxes and the resend button below already say the rest.
 */
const NOTICES = {
  created: {
    tone: "success",
    en: "Account created. Enter the code we just emailed you.",
    hi: "खाता बन गया। अभी भेजा गया कोड भरें।",
  },
  resent: {
    tone: "info",
    en: "This email was registered but never verified — we've sent a fresh code.",
    hi: "यह ईमेल पहले से रजिस्टर था पर सत्यापित नहीं — नया कोड भेज दिया है।",
  },
} as const;

/**
 * Six-digit email verification.
 *
 * Deliberately spare: address, boxes, verify, resend, and a single line saying
 * how long a code lives. Everything a person needs is on screen and nothing
 * else is — the earlier draft explained pasting, spam folders and the magic
 * link in prose, and buried the one control (resend) that unsticks the flow.
 */
export function VerifyOtpForm({
  email: initialEmail = "",
  lockEmail = false,
  onChangeEmail,
  notice,
  showHeader = false,
  initialCooldown = 0,
  redirectTo = "/login?verified=1",
}: {
  email?: string;
  /** Register knows the address it just submitted, so it is shown, not asked for. */
  lockEmail?: boolean;
  onChangeEmail?: () => void;
  notice?: "created" | "resent";
  showHeader?: boolean;
  initialCooldown?: number;
  redirectTo?: string;
}) {
  const router = useRouter();
  const otpRef = React.useRef<OtpInputHandle>(null);
  const resendRef = React.useRef<HTMLButtonElement>(null);

  const [email, setEmail] = React.useState(initialEmail);
  const [code, setCode] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | undefined>();
  const [failure, setFailure] = React.useState<Failure | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(initialCooldown);
  const [resending, setResending] = React.useState(false);

  const cooling = cooldown > 0;

  /**
   * Where "verified" lands, with the address appended so the login form can
   * pre-fill it. Safe to carry: the server only returns ok for an address that
   * a live code was issued to, so by this point it is the account's own — not
   * whatever was typed into the box.
   */
  const destination = React.useMemo(() => {
    const [path, query = ""] = redirectTo.split("?");
    const params = new URLSearchParams(query);
    if (email) params.set("email", email);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  }, [redirectTo, email]);

  // Land on the login screen once the confirmation has been read, but leave a
  // button so nobody is stranded if the redirect is blocked.
  React.useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => {
      router.push(destination);
      router.refresh();
    }, 1800);
    return () => window.clearTimeout(id);
  }, [done, destination, router]);

  // Keyed on the boolean, not the count: the interval is created once per
  // cooldown rather than torn down and rebuilt on every tick.
  React.useEffect(() => {
    if (!cooling) return;
    const id = window.setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooling]);

  /**
   * Put the caret back on the first box. Deferred by a tick because the boxes
   * are still disabled — by the in-flight request or by the failure we are
   * clearing — until React has re-rendered them, and a disabled input cannot
   * take focus.
   */
  const refocusCode = () => {
    window.setTimeout(() => otpRef.current?.focus(), 0);
  };

  /**
   * Locking the code disables all six boxes and the verify button, and the
   * browser drops focus to <body> when the element holding it is disabled — so
   * a keyboard or screen-reader user would have to tab back in from the top of
   * the document. Hand focus to resend instead, which is the only control that
   * can unstick the flow. Same deferral as `refocusCode`, and skipped while the
   * cooldown has it disabled, since a disabled button cannot take focus either.
   */
  const focusResend = () => {
    window.setTimeout(() => {
      const el = resendRef.current;
      if (el && !el.disabled) el.focus();
    }, 0);
  };

  const submit = async (codeValue: string) => {
    if (busy) return;
    setEmailError(undefined);
    setFailure(null);

    const parsed = verifyOtpSchema.safeParse({ email, code: codeValue });
    if (!parsed.success) {
      const onEmail = parsed.error.issues.some((i) => i.path[0] === "email");
      if (onEmail) {
        setEmailError("Enter the email address you registered with.");
      } else {
        setFailure({
          en: "Enter all six digits from your email.",
          hi: "ईमेल में दिए पूरे छह अंक भरें।",
        });
      }
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        setDone(true);
        toast.success("Email verified — your account is active.");
        return;
      }

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        fields?: Record<string, string>;
      };

      if (json.code === "VALIDATION") {
        setFailure({
          en: json.fields?.code || "Enter the 6-digit code from your email.",
          hi: "ईमेल में दिया 6 अंकों का कोड भरें।",
        });
      } else {
        setFailure(FAILURES[json.code ?? "UNKNOWN"] ?? FAILURES.UNKNOWN);
      }

      setCode("");
      // A locked code cannot be retyped into life, so the caret would only be a
      // distraction — the resend button below is where the user needs to go.
      if (FAILURES[json.code ?? ""]?.locked) focusResend();
      else refocusCode();
    } catch {
      setFailure({
        en: "Network error. Check your connection and try again.",
        hi: "नेटवर्क में दिक़्क़त है। कनेक्शन जाँचकर दोबारा कोशिश करें।",
      });
    } finally {
      setBusy(false);
    }
  };

  /**
   * Issuing a new code retires the previous one, so the boxes are cleared and
   * any "this code is closed" failure is dropped along with it.
   */
  const resend = async () => {
    if (resending || cooling) return;

    const parsed = resendVerificationSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailError("Enter the email address you registered with.");
      return;
    }

    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error || "Could not send a new code. Please try again.");
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode("");
      setFailure(null);
      toast.success("A new code is on its way — check spam too.");
      refocusCode();
    } catch {
      toast.error("Network error. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
          <CheckCircle2 size={30} />
        </span>
        <h2 className="type-h3 mt-4">Email verified</h2>
        <Hi className="mt-1 block text-brand-700">ईमेल सत्यापित हो गया</Hi>
        <p className="type-small mt-3 text-ink-600">
          Your account is active — sign in to start earning points.
        </p>
        <Hi className="mt-1 block text-[0.8rem] text-ink-500">
          आपका खाता चालू हो गया है — पॉइंट्स कमाने के लिए साइन इन करें।
        </Hi>
        <ButtonLink href={destination} variant="gradient" size="lg" className="mt-6 w-full">
          Continue to login
          <Hi inline>लॉग इन करें</Hi>
        </ButtonLink>
      </div>
    );
  }

  const locked = !!failure?.locked;

  return (
    <div className="space-y-5">
      {showHeader && (
        <h2 className="text-lg font-semibold text-ink-900">
          Verify your email
          <Hi inline className="ml-2 text-brand-700">
            ईमेल सत्यापित करें
          </Hi>
        </h2>
      )}

      {notice && (
        <Alert tone={NOTICES[notice].tone}>
          {NOTICES[notice].en}
          <Hi className="mt-0.5 block">{NOTICES[notice].hi}</Hi>
        </Alert>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
        className="space-y-4"
        noValidate
      >
        {lockEmail ? (
          // break-all, because an address long enough to need wrapping has no
          // space to wrap at and would otherwise widen the card.
          <p className="text-sm text-ink-600">
            Code sent to{" "}
            <span className="font-semibold break-all text-ink-900">{email}</span>
            {onChangeEmail && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={onChangeEmail}
                  className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  Change
                </button>
              </>
            )}
            <Hi className="mt-0.5 block text-ink-500">कोड इसी ईमेल पर भेजा गया है।</Hi>
          </p>
        ) : (
          <AuthField
            label="Email"
            labelHi="ईमेल"
            htmlFor="verify-email"
            required
            error={emailError}
          >
            <Input
              id="verify-email"
              type="email"
              autoComplete="email"
              value={email}
              aria-invalid={!!emailError}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(undefined);
              }}
            />
          </AuthField>
        )}

        <OtpInput
          ref={otpRef}
          value={code}
          onChange={setCode}
          onComplete={(next) => void submit(next)}
          label="6-digit code"
          labelHi="6 अंकों का कोड"
          hint="Each code is valid for 10 minutes."
          hintHi="हर कोड 10 मिनट तक मान्य है।"
          error={failure?.en}
          errorHi={failure?.hi}
          disabled={busy || locked}
          // Only when the address is already known — otherwise the email field
          // is the first thing that needs answering.
          autoFocus={!!initialEmail}
        />

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          // Same reason as the register CTA: a nowrap bilingual label on a
          // fixed-height pill overflows the 280px card at 360px. Wrapping keeps
          // it inside; a single-line label is shorter than `min-h-13`, so wide
          // cards look exactly as they did.
          className="h-auto min-h-13 w-full py-3 whitespace-normal"
          loading={busy}
          disabled={locked || code.length < 6}
        >
          {!busy && <ShieldCheck size={18} />}
          Verify &amp; activate
          <Hi inline>सत्यापित करें</Hi>
        </Button>
      </form>

      <div className="flex justify-center">
        <Button
          ref={resendRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void resend()}
          loading={resending}
          disabled={cooling}
        >
          {!resending && <RotateCw size={15} aria-hidden />}
          {cooling ? (
            <>
              Resend in {cooldown}s
              <Hi inline>{cooldown} सेकंड बाद</Hi>
            </>
          ) : (
            <>
              Resend code
              <Hi inline>नया कोड भेजें</Hi>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
