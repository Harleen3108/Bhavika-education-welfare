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

export type ParallaxProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  /**
   * Depth multiplier. The element travels roughly `speed * 200` pixels over the
   * full scroll pass, moving slower than the page. Negative values invert the
   * direction so the element leads the scroll instead of trailing it.
   */
  speed?: number;
  className?: string;
  as?: MotionTag;
};

/**
 * Scroll-linked vertical drift, for depth behind heroes and feature bands.
 *
 * WHY: parallax is easy to get wrong in ways that hurt — large travel distances
 * open gaps at the edges of a section and cause layout thrash. This constrains
 * the effect to a small, predictable pixel budget derived from `speed`, and
 * scrubs it directly off scroll position so it can never run away from the user.
 *
 * The element itself translates while its box stays in normal flow, so give the
 * parent `overflow-hidden` when the child is a full-bleed image or background.
 *
 * A11Y CONTRACT: parallax is decorative motion and is *entirely* skipped under
 * `prefers-reduced-motion: reduce` — the child renders at its natural position
 * with no transform at all. Nothing about the layout depends on the effect
 * running, so a JS failure is equally harmless.
 */
export function Parallax({
  children,
  speed = 0.3,
  className,
  as: Tag = "div",
  ...props
}: ParallaxProps) {
  const ref = React.useRef<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || speed === 0) return;
    registerGsap();

    const travel = speed * 100;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: () => travel },
        {
          y: () => -travel,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            // A little scrub lag smooths out coarse wheel steps without ever
            // letting the element lose sync with the scrollbar.
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [speed]);

  return (
    <Tag ref={ref} className={cn(className)} {...props}>
      {children}
    </Tag>
  );
}
