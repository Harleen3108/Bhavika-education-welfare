import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { Spinner } from "@/components/ui/States";
import { Hi } from "@/components/ui/Bilingual";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Bhavika Foundation account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthCard
      eyebrow="Member login"
      eyebrowHi="सदस्य लॉगिन"
      title="Welcome back"
      titleHi="फिर से स्वागत है"
      subtitle="Log in to pick up your points, streaks and quizzes right where you left them."
      subtitleHi="अपने पॉइंट्स और क्विज़ वहीं से जारी रखने के लिए लॉग इन करें।"
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-700">
            Create a free account
          </Link>
          <Hi inline className="ml-1.5">
            नया खाता बनाएँ
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
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
