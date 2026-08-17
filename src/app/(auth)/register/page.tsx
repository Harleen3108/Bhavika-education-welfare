import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Spinner } from "@/components/ui/States";

export const metadata: Metadata = {
  title: "Create account",
  description: "Join Bhavika Education & Welfare Foundation.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Join the movement"
      subtitle="Create your free account to learn, engage and grow with us."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
