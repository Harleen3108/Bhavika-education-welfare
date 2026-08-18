import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyOtpForm } from "@/components/auth/VerifyOtpForm";
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
 * A working link verifies on arrival and hands straight off to the login form,
 * which carries the "verified" banner and the pre-filled address — the old
 * success card was a dead end whose only control was a button to that same
 * screen. Anything else — no link, an expired one, a mail client that mangled
 * it — falls through to the 6-digit code form, which is the recovery path
 * rather than a footnote. There is no state of this page without a visible way
 * to get verified.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  let verified = false;
  let verifiedEmail: string | undefined;
  let linkError: string | null = null;

  if (token) {
    try {
      verifiedEmail = await verifyEmail(token);
      verified = true;
    } catch (err) {
      linkError =
        err instanceof Error
          ? err.message
          : "This verification link is invalid or has expired.";
    }
  }

  // Outside the catch above on purpose: redirect() signals by throwing, so
  // calling it in the try would be caught and reported as a broken link.
  if (verified) {
    const params = new URLSearchParams({ verified: "1" });
    // Absent when the link was merely replayed — see verifyEmail.
    if (verifiedEmail) params.set("email", verifiedEmail);
    redirect(`/login?${params.toString()}`);
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
