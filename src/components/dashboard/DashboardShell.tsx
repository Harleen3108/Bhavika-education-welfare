"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
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
  ShieldAlert,
  Home,
  IdCard,
  HeartHandshake,
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
  "/dashboard/donations": HeartHandshake,
  "/dashboard/id-card": IdCard,
  "/dashboard/profile": UserRound,
  "/admin": LayoutDashboard,
  "/admin/content": FileText,
  "/admin/gallery": Images,
  "/admin/videos": VideoIcon,
  "/admin/testimonials": MessageSquareQuote,
  "/admin/partners": Handshake,
  "/admin/quizzes": Trophy,
  "/admin/users": Users,
  "/admin/id-cards": IdCard,
  "/admin/donations": HeartHandshake,
  "/admin/wallet": WalletIcon,
  "/admin/referrals": Gift,
  "/admin/contacts": Mail,
  "/admin/security": ShieldAlert,
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

  /*
    Close the drawer when the route changes. Done by adjusting state during
    render rather than in an effect: an effect would paint the new page with the
    drawer still over it for a frame, and `react-hooks/set-state-in-effect`
    rightly rejects it. React re-runs this component immediately on the setState
    below, before committing anything to the DOM.
  */
  const [renderedPath, setRenderedPath] = React.useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin"
      ? pathname === href
      : pathname.startsWith(href);

  /*
    The nav scrolls rather than the whole panel. The admin variant carries 12
    destinations: at a 44px touch height that is ~530px of links, which does not
    fit a phone drawer (or a short laptop rail) alongside the logo, the account
    box and Logout. Without min-h-0 a flex child refuses to shrink past its
    content and the tail of the list was simply unreachable.
  */
  const NavList = (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {nav.map((item) => {
        const Icon = ICONS[item.href] ?? LayoutDashboard;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              // py-3 clears a 44px touch target in the mobile drawer; the
              // desktop rail keeps its tighter original rhythm.
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors lg:py-2.5",
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-ink-600 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            <Icon size={18} className="shrink-0" />
            <span className="min-w-0 truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const UserBox = (
    <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3">
      <Avatar src={user.avatarUrl} name={user.name} size={38} className="h-9 w-9" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-800">{user.name}</p>
        <p className="truncate text-xs text-ink-500">{user.email}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ink-200 bg-white px-4 lg:hidden">
        {/* -my-2 py-2 grows the hit area to 52px without moving the lockup. */}
        <Logo size={36} className="-my-2 py-2" />
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
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 overflow-hidden border-r border-ink-200 bg-ink-50/60 p-4 lg:flex">
          <div className="shrink-0 px-1 py-2">
            <Logo />
            {variant === "admin" && (
              <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                Admin
              </span>
            )}
          </div>
          {NavList}
          <div className="shrink-0 space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-ink-600 hover:bg-ink-100 lg:py-2.5"
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
            <div className="absolute left-0 top-0 flex h-full max-h-dvh w-72 max-w-[85%] flex-col gap-4 overflow-hidden bg-white p-4 shadow-xl">
              <div className="flex shrink-0 items-center justify-between">
                <Logo size={36} />
                <button
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink-100"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>
              {NavList}
              <div className="shrink-0 space-y-2">
                <Link href="/" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-ink-600 hover:bg-ink-100 lg:py-2.5">
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
