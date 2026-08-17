"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Display-only countdown. It anchors to the SERVER's clock via `serverNow` so a
 * device clock change at load can't grant extra time. The backend independently
 * enforces the real expiry — this is purely for UX.
 */
export function QuizTimer({
  expiresAt,
  serverNow,
  onExpire,
}: {
  expiresAt: string;
  serverNow: string;
  onExpire: () => void;
}) {
  const offsetRef = React.useRef(Date.parse(serverNow) - Date.now());
  const [remaining, setRemaining] = React.useState(() =>
    Math.max(0, Date.parse(expiresAt) - (Date.now() + offsetRef.current)),
  );
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, Date.parse(expiresAt) - (Date.now() + offsetRef.current));
      setRemaining(ms);
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire();
      }
    };
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);

  const totalSec = Math.ceil(remaining / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const danger = totalSec <= 30;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-sm font-semibold tabular-nums",
        danger ? "bg-red-50 text-[--color-danger]" : "bg-brand-50 text-brand-700",
      )}
      role="timer"
      aria-live="off"
    >
      <Clock size={16} />
      {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
    </div>
  );
}
