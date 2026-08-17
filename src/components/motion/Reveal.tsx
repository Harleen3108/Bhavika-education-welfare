"use client";

import * as React from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import {
  prefersReducedMotion,
  registerGsap,
  useIsomorphicLayoutEffect,
  type MotionTag,
} from "./useGsap";

export type RevealProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  /** Seconds to wait after the trigger fires. Useful for hand-tuned sequences. */
  delay?: number;
  /** Pixels the element travels upward as it fades in. */
  y?: number;
  /** Seconds the fade-up takes. */
  duration?: number;
  /** When false the element re-hides and replays if scrolled back past. */
  once?: boolean;
  className?: string;
  /** Rendered element. Keeps the wrapper semantic instead of forcing a div. */
  as?: MotionTag;
};

/**
 * Fade + rise + slight scale as the element scrolls into view.
 *
 * WHY: this is the single most-used entrance in the marketing pages, and hand
 * rolling it per section led to inconsistent distances and easing. One wrapper
 * keeps every band on the same rhythm and gives us one place to fix motion bugs.
 *
 * A11Y CONTRACT: children are rendered in their final, visible state — no
 * `opacity-0` class, no hidden initial style. The `from` state is applied by
 * GSAP only after the effect has confirmed the user allows motion. Under
 * `prefers-reduced-motion: reduce`, or with JS disabled or broken, the content
 * simply sits there fully readable and correctly positioned.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.7,
  once = true,
  className,
  as: Tag = "div",
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    registerGsap();

    // Scoped so revert() cleanly strips every inline style GSAP added, which is
    // what makes React 19 StrictMode's double-invoke a no-op rather than a
    // second stacked animation.
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration,
          delay,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once,
            toggleActions: once ? "play none none none" : "play none none reverse",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [delay, y, duration, once]);

  return (
    <Tag ref={ref} className={cn(className)} {...props}>
      {children}
    </Tag>
  );
}
