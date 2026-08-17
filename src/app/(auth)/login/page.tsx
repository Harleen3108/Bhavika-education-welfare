import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { Spinner } from "@/components/ui/States";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Bhavika Foundation account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to continue your learning journey."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
