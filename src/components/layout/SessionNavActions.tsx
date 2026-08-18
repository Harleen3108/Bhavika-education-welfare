"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

type Role = "USER" | "ADMIN";

/**
 * The navbar's account-dependent buttons, resolved in the browser.
 *
 * WHY THIS IS A CLIENT COMPONENT: reading the session on the server means
 * reading cookies, and a cookie read in a layout opts every page beneath it out
 * of static rendering. That is what made the whole marketing site render on
 * demand — `export const revalidate` on the pages could never take effect,
 * so each visit paid for a fresh render plus several Atlas round-trips before
 * anything painted.
 *
 * Rendering the signed-out state first is deliberate: it matches the
 * prerendered HTML exactly, so there is no hydration mismatch, and the vast
 * majority of marketing-page traffic is signed out and sees the correct
 * buttons immediately. A signed-in visitor sees them swap to "Dashboard" once
 * the check returns.
 */
export function SessionNavActions({ compact = false }: { compact?: boolean }) {
  const [role, setRole] = React.useState<Role | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();
    fetch("/api/auth/session", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s?.user?.role) setRole(s.user.role as Role);
      })
      .catch(() => {
        // A failed session probe just leaves the signed-out buttons in place.
      });
    return () => ac.abort();
  }, []);

  const size = compact ? undefined : ("sm" as const);
  const cls = compact ? "flex-1" : undefined;

  if (role) {
    return (
      <ButtonLink
        href={role === "ADMIN" ? "/admin" : "/dashboard"}
        variant="gradient"
        size={size}
        className={cls}
      >
        Dashboard {!compact && <ArrowUpRight size={16} />}
      </ButtonLink>
    );
  }

  return (
    <>
      <ButtonLink
        href="/login"
        variant={compact ? "outline" : "ghost"}
        size={size}
        className={cls}
      >
        Log in
      </ButtonLink>
      <ButtonLink href="/register" variant="gradient" size={size} className={cls}>
        Play quiz {!compact && <ArrowUpRight size={16} />}
      </ButtonLink>
    </>
  );
}
