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

export type StaggerGroupProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  /** Seconds between consecutive children. */
  stagger?: number;
  className?: string;
  /** Pixels each child travels upward as it fades in. */
  y?: number;
  /** Seconds a single child's fade-up takes. */
  duration?: number;
  /** Seconds to wait after the trigger fires, before the first child moves. */
  delay?: number;
  /** When false the group re-hides and replays if scrolled back past. */
  once?: boolean;
  /** Rendered wrapper element, e.g. `"ul"` for a list of cards. */
  as?: MotionTag;
};

/**
 * Reveals its *direct DOM children* one after another as the group scrolls in.
 *
 * WHY: card grids and stat rows read far better when items arrive in sequence,
 * but wrapping each item in its own `Reveal` means hand-computing a delay per
 * item and re-computing it whenever the list length changes. This measures the
 * children at runtime instead, so it stays correct for data-driven lists.
 *
 * Because it animates DOM children rather than React children, it works with
 * mapped arrays, fragments and server-rendered lists alike. Apply layout classes
 * (grid, flex, gap) via `className` exactly as you would on a plain wrapper.
 *
 * A11Y CONTRACT: identical to `Reveal` — children ship visible, and the hidden
 * `from` state is only ever set once the effect has confirmed motion is allowed.
 * Reduced-motion users, and anyone without working JS, get the finished layout.
 */
export function StaggerGroup({
  children,
  stagger = 0.1,
  className,
  y = 20,
  duration = 0.6,
  delay = 0,
  once = true,
  as: Tag = "div",
  ...props
}: StaggerGroupProps) {
  const ref = React.useRef<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const items = Array.from(el.children);
    if (items.length === 0) return;

    registerGsap();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration,
          delay,
          stagger,
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
  }, [stagger, y, duration, delay, once]);

  return (
    <Tag ref={ref} className={cn(className)} {...props}>
      {children}
    </Tag>
  );
}
