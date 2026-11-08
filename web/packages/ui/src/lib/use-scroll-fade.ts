"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Which edges of a scroller still have content past them: `x` more to the right, `y` more below. */
export type ScrollFade = "x" | "y" | "xy" | undefined;

/**
 * Whether a scroller is cut at its far edge, so the cut can fade (Lib-Display: on a phone a row of
 * tabs scrolls and the cut edge fades; a scroll area fades the edge that has more). It listens to
 * the element's scroll and size and to its children, and says nothing when the content fits.
 */
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [fade, setFade] = useState<ScrollFade>(undefined);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const x = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    const y = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setFade(x && y ? "xy" : x ? "x" : y ? "y" : undefined);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(el);
    for (const child of Array.from(el.children)) observer?.observe(child);
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [measure]);

  return { ref, fade };
}

/** The mask that fades the far edge. Literal strings, so Tailwind's scanner sees every one. */
export const FADE_MASK = {
  x: "[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]",
  y: "[mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)]",
  xy: "[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent),linear-gradient(to_bottom,#000_calc(100%-32px),transparent)] [mask-composite:intersect]",
} as const;
