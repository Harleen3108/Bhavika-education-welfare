"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Wallet as WalletIcon,
  Gift,
  Medal,
  UserRound,
  Menu,
  X,
  FileText,
  Images,
  Video as VideoIcon,
  MessageSquareQuote,
  Handshake,
  Users,
  Mail,
  Settings,
  Home,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/quizzes": Trophy,
  "/dashboard/wallet": WalletIcon,
  "/dashboard/referrals": Gift,
  "/dashboard/leaderboard": Medal,
  "/dashboard/benefits": Gift,
  "/dashboard/profile": UserRound,
  "/admin": LayoutDashboard,
  "/admin/content": FileText,
  "/admin/gallery": Images,
  "/admin/videos": VideoIcon,
  "/admin/testimonials": MessageSquareQuote,
  "/admin/partners": Handshake,
  "/admin/quizzes": Trophy,
  "/admin/users": Users,
  "/admin/wallet": WalletIcon,
  "/admin/referrals": Gift,
  "/admin/contacts": Mail,
  "/admin/settings": Settings,
};

export type NavItem = { label: string; href: string };

export function DashboardShell({
  nav,
  user,
  variant = "user",
  children,
}: {
  nav: readonly NavItem[];
  user: { name: string; email: string; avatarUrl?: string };
  variant?: "user" | "admin";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin"
      ? pathname === href
      : pathname.startsWith(href);

  const NavList = (
    <nav className="flex flex-1 flex-col gap-1">
      {nav.map((item) => {
        const Icon = ICONS[item.href] ?? LayoutDashboard;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-ink-600 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            <Icon size={18} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const UserBox = (
    <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" width={38} height={38} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
          {user.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-800">{user.name}</p>
        <p className="truncate text-xs text-ink-500">{user.email}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[--color-background]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ink-200 bg-white px-4 lg:hidden">
        <Logo size={36} />
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[100rem]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 border-r border-ink-200 bg-ink-50/60 p-4 lg:flex">
          <div className="px-1 py-2">
            <Logo />
            {variant === "admin" && (
              <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                Admin
              </span>
            )}
          </div>
          {NavList}
          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              <Home size={18} /> Back to site
            </Link>
            {UserBox}
            <LogoutButton className="w-full justify-center" />
          </div>
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col gap-4 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <Logo size={36} />
                <button
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink-100"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>
              {NavList}
              <div className="space-y-2">
                <Link href="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100">
                  <Home size={18} /> Back to site
                </Link>
                {UserBox}
                <LogoutButton className="w-full justify-center" />
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
