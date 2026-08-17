"use client";

import * as React from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import {
  prefersReducedMotion,
  registerGsap,
  supportsFinePointer,
  useIsomorphicLayoutEffect,
} from "./useGsap";

export type TiltCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  /** Maximum rotation in degrees at the very edge of the card. */
  max?: number;
  className?: string;
  /** Adds a soft specular highlight that tracks the pointer. */
  glare?: boolean;
};

const GLARE_GRADIENT =
  "radial-gradient(22rem circle at var(--tilt-glare-x, 50%) var(--tilt-glare-y, 50%), rgba(255,255,255,0.7), rgba(255,255,255,0) 60%)";

/**
 * Pointer-driven 3D tilt for feature and programme cards.
 *
 * WHY: a small amount of perspective makes a card feel physical and picks out
 * the one the user is actually pointing at, which matters on dense grids. It is
 * pure decoration though, so it is written to fail closed: everything runs from
 * listeners attached inside the effect, meaning when the effect bails out there
 * is no tilt code on the page at all rather than a disabled code path.
 *
 * A11Y CONTRACT: the effect is skipped entirely under
 * `prefers-reduced-motion: reduce` *and* on coarse or non-hovering pointers. The
 * touch guard is not a nicety — on a touchscreen a tilt latches on first tap,
 * never resets, and competes with the scroll gesture. Keyboard users are
 * unaffected because focus styles and hit targets live on the children, which
 * render untouched and fully visible with or without JS.
 */
export function TiltCard({
  children,
  max = 10,
  className,
  glare = false,
  ...props
}: TiltCardProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const glareRef = React.useRef<HTMLSpanElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !supportsFinePointer()) return;
    registerGsap();

    const glareEl = glareRef.current;

    const ctx = gsap.context(() => {
      gsap.set(el, { transformPerspective: 900, transformStyle: "preserve-3d" });
      if (glareEl) {
        gsap.set(glareEl, { "--tilt-glare-x": "50%", "--tilt-glare-y": "50%" });
      }

      const onMove = (event: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        // Normalised to -0.5..0.5 from the card's centre.
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        gsap.to(el, {
          rotationY: x * 2 * max,
          // Inverted so the edge nearest the pointer tips towards the viewer.
          rotationX: -y * 2 * max,
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
        });

        if (glareEl) {
          gsap.to(glareEl, {
            "--tilt-glare-x": `${(x + 0.5) * 100}%`,
            "--tilt-glare-y": `${(y + 0.5) * 100}%`,
            opacity: 1,
            duration: 0.4,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
      };

      const onLeave = () => {
        // Elastic ease gives the card a physical settle rather than a dead stop.
        gsap.to(el, {
          rotationX: 0,
          rotationY: 0,
          duration: 0.9,
          ease: "elastic.out(1, 0.5)",
          overwrite: "auto",
        });
        if (glareEl) {
          gsap.to(glareEl, { opacity: 0, duration: 0.4, ease: "power2.out", overwrite: "auto" });
        }
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      el.addEventListener("pointercancel", onLeave);

      // Returned to gsap.context so revert() tears listeners down alongside the
      // tweens. The per-pointermove tweens are created after the context has
      // closed, so they are killed explicitly here.
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        el.removeEventListener("pointercancel", onLeave);
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: "transform" });
        if (glareEl) {
          gsap.killTweensOf(glareEl);
          gsap.set(glareEl, { clearProps: "opacity" });
        }
      };
    }, el);

    return () => ctx.revert();
  }, [max, glare]);

  return (
    <div ref={ref} className={cn("relative", className)} {...props}>
      {children}
      {glare ? (
        <span
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-soft-light"
          style={{ backgroundImage: GLARE_GRADIENT }}
        />
      ) : null}
    </div>
  );
}
