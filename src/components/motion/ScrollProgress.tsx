"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, registerGsap, useIsomorphicLayoutEffect } from "./useGsap";

export type ScrollProgressProps = {
  className?: string;
  /** Bar thickness in pixels. */
  height?: number;
};

/**
 * A thin brand-gradient bar pinned to the top of the viewport showing how far
 * through the page the reader is.
 *
 * WHY: the long-form pages (About, programmes, reports) are tall enough that
 * readers lose their sense of position, and a scrollbar alone is easy to miss on
 * trackpads and phones. Rendered above the sticky navbar (z-60 over its z-50) so
 * it stays visible while the header is pinned.
 *
 * A11Y CONTRACT: the bar is `aria-hidden` — it duplicates information assistive
 * tech already exposes through the scroll position, so announcing it would be
 * noise. It is a scroll *indicator* rather than decorative motion, so it keeps
 * working under `prefers-reduced-motion: reduce`; what changes is that the
 * smoothing lag is dropped and the fill tracks the scrollbar 1:1, with no
 * easing or movement the user did not directly cause. Because it displays no
 * content of its own, starting at zero width without JS is the correct state.
 */
export function ScrollProgress({ className, height = 3 }: ScrollProgressProps) {
  const barRef = React.useRef<HTMLDivElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    registerGsap();

    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bar,
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            start: 0,
            end: () => ScrollTrigger.maxScroll(window),
            scrub: reduced ? true : 0.25,
            invalidateOnRefresh: true,
          },
        },
      );
    }, bar);

    return () => ctx.revert();
  }, []);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-x-0 top-0 z-[60]", className)}
      style={{ height }}
    >
      {/* The empty state is written as an inline transform rather than a
          `scale-x-0` utility: Tailwind's scale utilities may compile to the
          standalone `scale` property, which would multiply against the
          `transform` GSAP writes and pin the bar at zero width forever. */}
      <div
        ref={barRef}
        className="h-full w-full bg-gradient-brand"
        style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
      />
    </div>
  );
}
