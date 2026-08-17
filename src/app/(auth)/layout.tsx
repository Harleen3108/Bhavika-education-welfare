import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-white">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-brand-700"
        >
          <ArrowLeft size={16} /> Back to site
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
