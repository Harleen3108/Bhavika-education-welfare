"use client";

import * as React from "react";
import { MessageCircle, Phone, Mail, X, MessageSquareText, SendHorizontal } from "lucide-react";
import { Hi } from "@/components/ui/Bilingual";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Persistent contact launcher, fixed to the corner of every public page.
 *
 * WHY: the audience reaches organisations on WhatsApp, not through a form, and
 * the contact page is four taps from most of the marketing site. This keeps a
 * one-tap route open from wherever a parent happens to be reading.
 *
 * The channels are plain links, so they work with JS broken; only the
 * expand/collapse needs the client.
 */

const CHANNELS = [
  {
    key: "whatsapp",
    href: `https://wa.me/${SITE.contact.whatsapp}`,
    external: true,
    icon: MessageCircle,
    label: "WhatsApp",
    labelHi: "व्हाट्सएप",
    hint: "Fastest reply",
    tone: "bg-[#25D366] text-white",
  },
  {
    key: "call",
    href: `tel:${SITE.contact.phone.replace(/\s+/g, "")}`,
    external: false,
    icon: Phone,
    label: "Call us",
    labelHi: "कॉल करें",
    hint: SITE.contact.phone,
    tone: "bg-accent-600 text-white",
  },
  {
    key: "email",
    href: `mailto:${SITE.contact.email}`,
    external: false,
    icon: Mail,
    label: "Email",
    labelHi: "ईमेल",
    hint: "We reply within a day",
    tone: "bg-brand-700 text-white",
  },
  {
    key: "form",
    href: "/contact",
    external: false,
    icon: SendHorizontal,
    label: "Send a message",
    labelHi: "संदेश भेजें",
    hint: "Fill the contact form",
    tone: "bg-night-800 text-white",
  },
] as const;

export function FloatingContact() {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  // Close on Escape and on a click outside. Registered only while open, so the
  // common case costs no listeners at all.
  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6"
    >
      {/* Channels. Kept mounted so the transition has something to animate,
          and `inert` while collapsed so they take no focus and are not read. */}
      <div
        inert={!open}
        className={cn(
          "flex flex-col items-end gap-2 transition-all duration-200",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {CHANNELS.map((c) => (
          <a
            key={c.key}
            href={c.href}
            {...(c.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="flex min-h-11 items-center gap-3 rounded-full border border-ink-200 bg-surface py-2 pr-2 pl-4 shadow-lg transition-transform hover:-translate-x-0.5"
          >
            <span className="text-right leading-tight">
              <span className="block text-sm font-semibold text-ink-900">
                {c.label} <Hi inline>{c.labelHi}</Hi>
              </span>
              <span className="block text-xs text-ink-500">{c.hint}</span>
            </span>
            <span
              aria-hidden
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                c.tone,
              )}
            >
              <c.icon size={17} />
            </span>
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close contact options" : "Contact us"}
        className="bg-gradient-cta inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {open ? <X size={24} /> : <MessageSquareText size={24} />}
      </button>
    </div>
  );
}
