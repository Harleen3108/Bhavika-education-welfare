"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmButton({
  onConfirm,
  message,
  children,
  className,
}: {
  onConfirm: () => void;
  message?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.confirm(message ?? "Are you sure? This cannot be undone.")) onConfirm();
      }}
    >
      {children}
    </button>
  );
}
