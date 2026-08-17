import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export function Logo({
  className,
  showText = true,
  variant = "dark",
  size = 44,
}: {
  className?: string;
  showText?: boolean;
  variant?: "dark" | "light";
  size?: number;
}) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label={`${SITE.name} — home`}
    >
      <Image
        src="/bhuvika.png"
        alt={`${SITE.name} logo`}
        width={size}
        height={size}
        priority
        className="h-auto w-auto rounded-full"
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      {showText && (
        <span className="flex flex-col leading-tight">
          <span
            className={cn(
              "font-display text-sm font-bold sm:text-base",
              variant === "light" ? "text-white" : "text-brand-800",
            )}
          >
            Bhavika Foundation
          </span>
          <span
            className={cn(
              "text-[10px] font-medium sm:text-xs",
              variant === "light" ? "text-white/80" : "text-accent-600",
            )}
          >
            Education &amp; Welfare
          </span>
        </span>
      )}
    </Link>
  );
}
