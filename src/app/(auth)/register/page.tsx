import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Spinner } from "@/components/ui/States";
import { Hi } from "@/components/ui/Bilingual";

export const metadata: Metadata = {
  title: "Create account",
  description: "Join Bhavika Education & Welfare Foundation.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthCard
      eyebrow="Free account"
      eyebrowHi="नि:शुल्क खाता"
      title="Join the movement"
      titleHi="हमारे साथ जुड़िए"
      subtitle="Create your account, verify your email, and start earning points today."
      subtitleHi="खाता बनाएँ, ईमेल सत्यापित करें और आज ही पॉइंट्स कमाना शुरू करें।"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-700">
            Log in
          </Link>
          <Hi inline className="ml-1.5">
            लॉग इन करें
          </Hi>
        </>
      }
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
