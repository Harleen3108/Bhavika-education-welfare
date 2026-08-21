"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SessionNavActions } from "@/components/layout/SessionNavActions";
import { Hi } from "@/components/ui/Bilingual";
import { PUBLIC_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);

  // The mobile menu is tracked as "open for this route" rather than a plain
  // boolean, so navigating closes it automatically — no effect, no cascading
  // render on every route change.
  const [openFor, setOpenFor] = React.useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean) => setOpenFor(next ? pathname : null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-shadow",
        scrolled
          ? "bg-background/90 shadow-[0_1px_0_0_var(--color-border),0_8px_24px_-12px_rgb(67_14_7/0.18)] backdrop-blur-md"
          : "bg-background",
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between gap-3 lg:h-20">
        <Logo />

        {/*
          Desktop nav — xl, not lg. The logo, eight bilingual links and two CTAs
          need roughly 1040px, which overflows the 992px container at lg (1024px)
          and crushes the links into the CTAs. The drawer carries them until xl.
        */}
        <ul className="hidden items-center gap-0.5 xl:flex">
          {PUBLIC_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-2 text-[0.9375rem] font-semibold transition-colors xl:px-3.5",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 xl:flex">
          <SessionNavActions />
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-800 hover:bg-ink-100 xl:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        // Collapsed with max-height, so the links stay in the DOM and would
        // otherwise still take Tab focus and be read out while invisible.
        inert={!open}
        className={cn(
          "overflow-hidden border-ink-200 bg-background transition-[max-height] duration-300 xl:hidden",
          open ? "max-h-[36rem] border-t" : "max-h-0",
        )}
      >
        <ul className="container-page flex flex-col gap-0.5 py-3">
          {PUBLIC_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-baseline gap-2 rounded-xl px-4 py-3 text-base font-semibold",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-800 hover:bg-ink-100",
                  )}
                >
                  {item.label}
                  <Hi inline>{item.hi}</Hi>
                </Link>
              </li>
            );
          })}
          <li className="mt-3 flex gap-2 px-1 pb-1">
            <SessionNavActions compact />
          </li>
        </ul>
      </div>
    </header>
  );
}
