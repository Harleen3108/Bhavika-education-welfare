import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "subtle"
  | "cta"
  | "onDark";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none " +
  "disabled:opacity-60 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-500 shadow-sm",
  secondary:
    "bg-accent-500 text-white hover:bg-accent-600 focus-visible:outline-accent-500 shadow-sm",
  outline:
    "border border-brand-600 text-brand-700 bg-transparent hover:bg-brand-50 focus-visible:outline-brand-500",
  ghost: "text-brand-700 hover:bg-brand-50 focus-visible:outline-brand-500",
  danger: "bg-[--color-danger] text-white hover:opacity-90 focus-visible:outline-red-500",
  subtle: "bg-ink-100 text-ink-800 hover:bg-ink-200 focus-visible:outline-brand-500",
  cta:
    "bg-cta-500 text-night-900 font-semibold hover:bg-cta-400 focus-visible:outline-cta-400 shadow-sm",
  onDark:
    "border border-white/40 text-white bg-white/5 hover:bg-white/15 focus-visible:outline-white backdrop-blur-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm sm:text-base",
  lg: "h-13 px-8 text-base",
  icon: "h-11 w-11",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export interface ButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
}

/** Styled link that looks like a button. */
export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  href,
  children,
  ...props
}: ButtonLinkProps) {
  const isExternal = /^https?:\/\//.test(href);
  const classes = cn(base, variants[variant], sizes[size], className);
  if (isExternal) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
