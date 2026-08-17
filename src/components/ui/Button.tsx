import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "gradient"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "subtle"
  | "cta"
  | "onDark";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-normal transition-all " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none " +
  "disabled:opacity-60 select-none whitespace-nowrap";

/*
  Button fills carry white label text, so they use the deeper end of the brand
  ramp: brand-500 measures only 3.19:1 against white and would fail WCAG AA on
  every primary action on the site. brand-700 clears it at 5.66:1 while staying
  unmistakably coral.
*/
const variants: Record<Variant, string> = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-600 shadow-sm",
  /** Signature gold→coral→rose CTA. Lifts on hover rather than shifting hue. */
  gradient:
    "bg-gradient-cta text-white shadow-[0_4px_14px_-2px_rgb(194_47_16/0.45)] " +
    "hover:shadow-[0_8px_22px_-4px_rgb(194_47_16/0.55)] hover:-translate-y-0.5 " +
    "focus-visible:outline-brand-600",
  secondary:
    "bg-accent-600 text-white hover:bg-accent-700 focus-visible:outline-accent-500 shadow-sm",
  outline:
    "border border-ink-300 text-ink-800 bg-surface hover:border-brand-400 hover:text-brand-700 focus-visible:outline-brand-500",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-brand-500",
  danger: "bg-danger text-white hover:opacity-90 focus-visible:outline-red-500",
  subtle: "bg-ink-100 text-ink-800 hover:bg-ink-200 focus-visible:outline-brand-500",
  cta:
    "bg-brand-700 text-white font-semibold hover:bg-brand-800 focus-visible:outline-brand-600 shadow-sm",
  onDark:
    "border border-white/40 text-white bg-white/5 hover:bg-white/15 focus-visible:outline-white backdrop-blur-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[0.9375rem] sm:text-base",
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
