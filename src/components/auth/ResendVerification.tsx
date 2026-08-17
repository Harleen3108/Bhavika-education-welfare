"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { toast } from "sonner";

export function ResendVerification() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
        toast.success("If your account needs verification, a new link is on its way.");
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return <p className="text-sm text-ink-600">A new verification link has been sent if needed.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" loading={loading} className="shrink-0">
        Resend link
      </Button>
    </form>
  );
}
