import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

/**
 * Brand lockup: the foundation emblem plus a two-line wordmark.
 *
 * The emblem is `/logo-mark.png` — the artwork cut out of the supplied lockup
 * with a transparent background, so it sits correctly on the cream page ground
 * and on the dark footer/auth panels without a visible plate behind it.
 *
 * The wordmark stays live HTML rather than being baked into the image: it keeps
 * type crisp at every size, lets the `light` variant recolour for dark
 * surfaces, and keeps the brand name in the accessibility tree and in search
 * results.
 */
export function Logo({
  className,
  showText = true,
  variant = "dark",
  size = 44,
  priority = false,
}: {
  className?: string;
  showText?: boolean;
  variant?: "dark" | "light";
  size?: number;
  priority?: boolean;
}) {
  const light = variant === "light";
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label={`${SITE.name} — home`}
    >
      <Image
        src="/logo-mark.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span className="flex flex-col leading-tight">
          <span
            className={cn(
              "font-display text-[1.0625rem] font-bold tracking-tight sm:text-lg",
              light ? "text-white" : "text-ink-900",
            )}
          >
            Bhavika
          </span>
          <span
            className={cn(
              "type-label text-[0.5rem] sm:text-[0.5625rem]",
              light ? "text-white/65" : "text-ink-500",
            )}
          >
            Education &amp; Welfare
          </span>
        </span>
      )}
    </Link>
  );
}

/**
 * The full stacked lockup — emblem, wordmark, bilingual strapline — for large
 * surfaces with room to breathe (the auth split panel, share cards). Not a
 * link, so it can sit inside one.
 */
export function LogoLockup({
  className,
  width = 260,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <Image
      src="/logo-lockup.png"
      alt={SITE.name}
      width={width}
      height={width}
      className={cn("h-auto", className)}
      style={{ width }}
    />
  );
}
