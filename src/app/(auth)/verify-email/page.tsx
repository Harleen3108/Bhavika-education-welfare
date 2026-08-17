import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyOtpForm } from "@/components/auth/VerifyOtpForm";
import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/States";
import { Hi } from "@/components/ui/Bilingual";
import { verifyEmail } from "@/server/services/auth.service";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Both verification paths land here.
 *
 * A working link verifies on arrival. Anything else — no link, an expired one,
 * a mail client that mangled it — falls through to the 6-digit code form, which
 * is the recovery path rather than a footnote. There is no state of this page
 * without a visible way to get verified.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  let verified = false;
  let linkError: string | null = null;

  if (token) {
    try {
      await verifyEmail(token);
      verified = true;
    } catch (err) {
      linkError =
        err instanceof Error
          ? err.message
          : "This verification link is invalid or has expired.";
    }
  }

  if (verified) {
    return (
      <AuthCard title="Email verified" titleHi="ईमेल सत्यापित हो गया">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
            <CheckCircle2 size={30} />
          </span>
          <p className="type-small mt-4 text-ink-600">
            Your account is active. Log in to start earning points.
          </p>
          <Hi className="mt-1 block text-[0.8rem] text-ink-500">
            आपका खाता चालू हो गया है। पॉइंट्स कमाने के लिए लॉग इन करें।
          </Hi>
          <ButtonLink href="/login?verified=1" variant="gradient" size="lg" className="mt-6 w-full">
            Continue to login
            <Hi inline>लॉग इन करें</Hi>
          </ButtonLink>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="One last step"
      eyebrowHi="बस एक आख़िरी क़दम"
      title={linkError ? "That link didn't work" : "Verify your email"}
      titleHi={linkError ? "यह लिंक काम नहीं आया" : "अपना ईमेल सत्यापित करें"}
      // No subtitle on the happy path: the field label, the boxes and the
      // resend button already say everything it used to.
      subtitle={linkError ? "Use the 6-digit code from the same email instead." : undefined}
      subtitleHi={linkError ? "उसी ईमेल में दिया 6 अंकों का कोड भरें।" : undefined}
      footer={
        <>
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Log in
          </Link>
          <Hi inline className="ml-1.5">
            लॉग इन
          </Hi>
          <span aria-hidden className="mx-2 text-ink-300">
            ·
          </span>
          <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            New account
          </Link>
          <Hi inline className="ml-1.5">
            नया खाता
          </Hi>
        </>
      }
    >
      {linkError && (
        <Alert tone="warning" className="mb-5">
          {linkError}
          <Hi className="mt-0.5 block">
            लिंक की समय-सीमा ख़त्म हो चुकी है या वह पहले ही इस्तेमाल हो चुका है।
          </Hi>
        </Alert>
      )}

      <VerifyOtpForm email={email ?? ""} />
    </AuthCard>
  );
}
