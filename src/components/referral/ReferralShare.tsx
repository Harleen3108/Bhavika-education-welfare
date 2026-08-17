"use client";

import * as React from "react";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

/** Which value is currently showing its "copied" confirmation, if any. */
type Copied = "link" | "code" | null;

const CONFIRM_MS = 2000;

export function ReferralShare({
  code,
  shareLink,
  perReferralPoints,
}: {
  code: string;
  shareLink: string;
  perReferralPoints: number;
}) {
  const [copied, setCopied] = React.useState<Copied>(null);
  const confirmTimer = React.useRef<number | undefined>(undefined);

  const message = `Join me on Bhavika Foundation — learn through quizzes and support a good cause! Sign up with my link: ${shareLink}`;

  React.useEffect(() => () => window.clearTimeout(confirmTimer.current), []);

  /**
   * `navigator.clipboard` is absent on plain-http origins and rejects outright
   * in some in-app browsers, so both are reported rather than swallowed — the
   * value is on screen either way and can still be selected by hand.
   */
  const copy = async (what: Exclude<Copied, null>, text: string, noun: string) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
    } catch {
      toast.error(`Couldn't copy your ${noun}. Please select it and copy manually.`);
      return;
    }
    toast.success(`Referral ${noun} copied!`);
    setCopied(what);
    // Cleared and restarted so copying the code right after the link does not
    // inherit the link's half-spent timer.
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setCopied(null), CONFIRM_MS);
  };

  const copyLink = () => void copy("link", shareLink, "link");
  const copyCode = () => void copy("code", code, "code");

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Bhavika Foundation", text: message, url: shareLink });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 p-6 text-white sm:p-8">
      <p className="text-sm font-medium text-white/80">Invite friends & earn</p>
      <p className="mt-1 font-display text-3xl font-bold">
        {perReferralPoints} points <span className="text-lg font-medium text-white/70">per friend</span>
      </p>
      <p className="mt-2 text-sm text-white/70">
        Share your link. When a friend joins and completes their first quiz, you earn points.
      </p>

      {/* Link box */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center rounded-xl bg-white/10 px-4 py-3">
          <span className="truncate font-mono text-sm text-white">{shareLink}</span>
        </div>
        <Button
          onClick={copyLink}
          variant="secondary"
          className="shrink-0 bg-white text-brand-700 hover:bg-white/90"
          aria-label={copied === "link" ? "Referral link copied" : "Copy referral link"}
        >
          {copied === "link" ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          {copied === "link" ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* Share actions */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle size={18} aria-hidden /> Share on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => void nativeShare()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <Share2 size={18} aria-hidden /> More options
        </button>
      </div>

      {/*
        Plenty of sign-ups ask for the bare code instead of the link, and the
        code was previously read-only text — copyable only by selecting eight
        characters by hand, which is exactly the sort of thing people mistype.
      */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-white/60">
        <span>Your code</span>
        <code className="font-mono text-sm font-bold tracking-wider text-white">{code}</code>
        <button
          type="button"
          onClick={copyCode}
          aria-label={copied === "code" ? "Referral code copied" : `Copy referral code ${code}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {copied === "code" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
