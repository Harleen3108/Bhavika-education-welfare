"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Hi } from "@/components/ui/Bilingual";
import { resendVerificationSchema } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

const COOLDOWN_SECONDS = 60;

/**
 * "Send it again" control for the verification email.
 *
 * The caller owns the address — this component only owns the request, the
 * 60-second cooldown and the status line. One send delivers both the magic link
 * and a fresh 6-digit code, and issuing a new code retires the previous one.
 */
export function ResendVerification({
  email,
  onSent,
  initialCooldown = 0,
  className,
}: {
  email: string;
  onSent?: () => void;
  /** Start counting down immediately when a code was just sent elsewhere. */
  initialCooldown?: number;
  className?: string;
}) {
  const [cooldown, setCooldown] = React.useState(initialCooldown);
  const [sending, setSending] = React.useState(false);
  const [sentOnce, setSentOnce] = React.useState(false);

  const cooling = cooldown > 0;
  const emailValid = resendVerificationSchema.safeParse({ email }).success;

  React.useEffect(() => {
    if (!cooling) return;
    const id = window.setInterval(
      () => setCooldown((s) => (s <= 1 ? 0 : s - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [cooling]);

  const send = async () => {
    if (sending || cooling || !emailValid) return;
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error || "Could not send it right now. Please try again.");
        return;
      }
      setCooldown(COOLDOWN_SECONDS);
      setSentOnce(true);
      toast.success("A new link and code are on their way.");
      onSent?.();
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn("rounded-xl border border-ink-200 bg-ink-50/70 px-4 py-3.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-ink-700">
          Didn&apos;t get the email?
          <Hi inline className="ml-1.5">
            ईमेल नहीं मिला?
          </Hi>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void send()}
          loading={sending}
          disabled={cooling || !emailValid}
        >
          {!sending && <RotateCw size={15} />}
          {cooling ? `Resend in ${cooldown}s` : "Send it again"}
        </Button>
      </div>

      <p className="mt-1.5 text-xs text-ink-500" aria-live="polite">
        {sentOnce
          ? "Sent — check your inbox and your spam folder. The newest code is the only one that works."
          : "We'll email a fresh link and a new 6-digit code together. Check your spam folder too."}
        <Hi inline className="ml-1.5">
          {sentOnce
            ? "भेज दिया — इनबॉक्स और स्पैम दोनों देखें। सिर्फ़ नया कोड ही चलेगा।"
            : "नया लिंक और नया 6 अंकों का कोड साथ भेजेंगे। स्पैम फ़ोल्डर भी देखें।"}
        </Hi>
      </p>
    </div>
  );
}
