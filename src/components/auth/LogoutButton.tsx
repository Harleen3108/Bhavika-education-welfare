"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  withIcon = true,
  children = "Log out",
}: {
  className?: string;
  withIcon?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-danger",
        className,
      )}
    >
      {withIcon && <LogOut size={16} />}
      {children}
    </button>
  );
}
