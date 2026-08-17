"use client";

import * as React from "react";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

export function ReferralShare({
  code,
  shareLink,
  perReferralPoints,
}: {
  code: string;
  shareLink: string;
  perReferralPoints: number;
}) {
  const [copied, setCopied] = React.useState(false);

  const message = `Join me on Bhavika Foundation — learn through quizzes and support a good cause! Sign up with my link: ${shareLink}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Please copy it manually.");
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Bhavika Foundation", text: message, url: shareLink });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
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
          onClick={copy}
          variant="secondary"
          className="shrink-0 bg-white text-brand-700 hover:bg-white/90"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? "Copied" : "Copy"}
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
          <MessageCircle size={18} /> Share on WhatsApp
        </a>
        <button
          onClick={nativeShare}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <Share2 size={18} /> More options
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-white/60">
        Your code: <span className="font-mono font-bold tracking-wider text-white">{code}</span>
      </p>
    </div>
  );
}
