import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { ButtonLink } from "@/components/ui/Button";
import { ResendVerification } from "@/components/auth/ResendVerification";
import { verifyEmail } from "@/server/services/auth.service";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let ok = false;
  let message = "This verification link is missing or invalid.";

  if (token) {
    try {
      await verifyEmail(token);
      ok = true;
    } catch (err) {
      message =
        err instanceof Error && "message" in err
          ? (err as Error).message
          : "This verification link is invalid or has expired.";
    }
  }

  if (ok) {
    return (
      <AuthCard title="Email verified">
        <div className="flex flex-col items-center py-2 text-center">
          <CheckCircle2 className="text-[--color-success]" size={52} />
          <p className="mt-4 text-ink-600">
            Your email is verified and your account is now active. Welcome aboard!
          </p>
          <ButtonLink href="/login" className="mt-6 w-full">
            Continue to login
          </ButtonLink>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Verification failed">
      <div className="flex flex-col items-center py-2 text-center">
        <XCircle className="text-[--color-danger]" size={52} />
        <p className="mt-4 text-ink-600">{message}</p>
      </div>
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-ink-800">Request a new verification link:</p>
        <ResendVerification />
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}
