"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Shared GSAP plumbing for the motion library.
 *
 * WHY: every motion component needs the same three things — ScrollTrigger
 * registered exactly once, a reliable read of the user's motion preference, and
 * a layout effect that does not warn during SSR. Centralising them keeps the
 * components themselves declarative and guarantees the a11y contract is applied
 * identically everywhere rather than re-derived (and mis-derived) per file.
 *
 * A11Y CONTRACT enforced by every consumer of this module: markup is authored in
 * its final, visible state. GSAP only ever sets a "from" state *after* an effect
 * has confirmed motion is allowed. If JS never runs, if hydration fails, or if
 * the user asks for reduced motion, the page is fully readable — there is no
 * code path that can leave content stuck at opacity 0.
 */

let pluginsRegistered = false;

/**
 * Register GSAP plugins once per browser session.
 *
 * Must only be called from inside an effect: ScrollTrigger touches `window` and
 * `document` on registration, so calling it at module scope would break SSR.
 */
export function registerGsap(): void {
  if (pluginsRegistered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  pluginsRegistered = true;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

function matches(query: string, fallback: boolean): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return fallback;
  }
  return window.matchMedia(query).matches;
}

/**
 * True when the user has asked the OS to reduce motion.
 *
 * Defaults to `false` on the server so the SSR pass never branches on a value it
 * cannot know; every caller reads this inside an effect, where the real value is
 * available before any "from" state is applied.
 */
export function prefersReducedMotion(): boolean {
  return matches(REDUCED_MOTION_QUERY, false);
}

/**
 * True only for devices with a precise, hovering pointer (mouse / trackpad).
 *
 * Pointer-driven 3D effects are actively harmful on touch: the tilt latches on
 * first touch and never resets, and it fights the browser's scroll gesture.
 * Defaults to `false` so anything gated on this stays off unless proven safe.
 */
export function supportsFinePointer(): boolean {
  return matches(FINE_POINTER_QUERY, false);
}

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * GSAP setup must run before paint so the "from" state is applied in the same
 * frame as hydration, but React warns about `useLayoutEffect` during SSR. This
 * is the standard GSAP/React reconciliation of the two.
 */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/** Tag name accepted by the polymorphic `as` prop, matching the house pattern. */
export type MotionTag = React.ElementType;
