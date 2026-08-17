"use client";

import * as React from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, registerGsap, useIsomorphicLayoutEffect } from "./useGsap";

export type CountUpProps = {
  /** The final number. Pass `10000` and `suffix="+"` to render "10,000+". */
  to: number;
  /** Static text after the number, e.g. `"+"`, `"%"`, `" hrs"`. */
  suffix?: string;
  /** Static text before the number, e.g. `"₹"`. */
  prefix?: string;
  /** Seconds the count takes. */
  duration?: number;
  className?: string;
  /** Fraction digits to hold steady while counting. */
  decimals?: number;
  /**
   * Number-formatting locale. Defaults to Indian digit grouping to match the
   * rest of the site (1,00,000 rather than 100,000).
   */
  locale?: string;
};

/**
 * Counts a statistic up from zero the first time it scrolls into view.
 *
 * WHY: impact numbers are the most persuasive thing on the page, and animating
 * them draws the eye without any extra copy. The catch is that most count-up
 * components render "0" on the server, which is a lie to crawlers and to anyone
 * whose JS never arrives — so this one renders the *final* formatted value in
 * the SSR markup and animation is purely an enhancement layered on top.
 *
 * The digits are written straight to a DOM node via a GSAP tween rather than
 * through React state, which keeps sixty renders a second out of the React tree
 * and sidesteps setState-in-effect entirely.
 *
 * A11Y CONTRACT: under `prefers-reduced-motion: reduce` the effect returns
 * before touching anything, leaving the server-rendered final value on screen.
 * The value is never blanked, never zeroed on cleanup, and is correct at every
 * point in the component's life — including mid-animation teardown.
 */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  duration = 1.8,
  className,
  decimals = 0,
  locale = "en-IN",
}: CountUpProps) {
  const rootRef = React.useRef<HTMLSpanElement | null>(null);
  const valueRef = React.useRef<HTMLSpanElement | null>(null);

  const format = React.useCallback(
    (value: number) =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value),
    [locale, decimals],
  );

  const finalText = format(to);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const node = valueRef.current;
    if (!root || !node || prefersReducedMotion()) return;
    registerGsap();

    const counter = { value: 0 };

    const ctx = gsap.context(() => {
      gsap.to(counter, {
        value: to,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          node.textContent = format(counter.value);
        },
        // Guarantees the exact target, never a rounding artefact of the tween.
        onComplete: () => {
          node.textContent = finalText;
        },
        scrollTrigger: { trigger: root, start: "top 90%", once: true },
      });
    }, root);

    return () => {
      ctx.revert();
      // The tween owns this text node, so restore the truthful value if we are
      // torn down (StrictMode remount, navigation) part-way through counting.
      node.textContent = finalText;
    };
  }, [to, duration, format, finalText]);

  return (
    <span ref={rootRef} className={cn(className)}>
      {prefix}
      <span ref={valueRef}>{finalText}</span>
      {suffix}
    </span>
  );
}
