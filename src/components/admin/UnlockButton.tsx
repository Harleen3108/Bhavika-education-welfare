"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { releaseAdminLockout } from "@/server/actions/users";

/** Lifts a lockout for one admin identity. */
export function UnlockButton({ email }: { email: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const unlock = async () => {
    setBusy(true);
    try {
      const res = await releaseAdminLockout(email);
      if (res.ok) {
        toast.success("Lockout cleared.");
        router.refresh();
      } else {
        toast.error(res.error || "Could not clear the lockout.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={unlock} loading={busy}>
      <Unlock size={15} /> Unlock
    </Button>
  );
}
