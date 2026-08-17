"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { PUBLIC_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Navbar({
  session,
}: {
  session?: { name: string; role: string } | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change.
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors",
        scrolled
          ? "bg-night-900/95 shadow-lg shadow-night-950/20 backdrop-blur supports-backdrop-filter:bg-night-900/80"
          : "bg-night-800",
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <Logo variant="light" />

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-bold transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 lg:flex">
          {session ? (
            <ButtonLink
              href={session.role === "ADMIN" ? "/admin" : "/dashboard"}
              variant="cta"
              size="sm"
            >
              Dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink
                href="/login"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                Log in
              </ButtonLink>
              <ButtonLink href="/register" variant="cta" size="sm">
                Join us
              </ButtonLink>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-white/10 bg-night-900 transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-128" : "max-h-0 border-t-0",
        )}
      >
        <ul className="container-page flex flex-col gap-1 py-3">
          {PUBLIC_NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-base font-bold",
                    active ? "bg-white/10 text-white" : "text-white/85 hover:bg-white/10",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="mt-2 flex gap-2 px-1">
            {session ? (
              <ButtonLink
                href={session.role === "ADMIN" ? "/admin" : "/dashboard"}
                variant="cta"
                className="flex-1"
              >
                Dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="onDark" className="flex-1">
                  Log in
                </ButtonLink>
                <ButtonLink href="/register" variant="cta" className="flex-1">
                  Join us
                </ButtonLink>
              </>
            )}
          </li>
        </ul>
      </div>
    </header>
  );
}
