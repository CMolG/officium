"use client";

import { useEffect, useState } from "react";

import type { Box } from "./placement";
import type { TourStep } from "./types";

/** How long a part may take to appear (a panel opening, a route settling) before the step centers. */
const WAIT_MS = 1500;
/** Air between the lit part and its ring. */
const PAD = 4;

export interface TourTarget {
  /** The lit part's box, padded, in viewport coordinates. Null: nothing to light. */
  box: Box | null;
  /** What a screen reader hears for the lit part. */
  name: string | null;
}

const NONE: TourTarget = { box: null, name: null };

function nameOf(element: Element): string | null {
  const label = element.getAttribute("aria-label") ?? element.textContent ?? "";
  const clean = label.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 80) : null;
}

/** The part's box, padded, and cut to the screen: a part taller than the screen is lit as far as the screen shows it. */
function boxOf(element: Element): Box {
  const rect = element.getBoundingClientRect();
  const top = Math.max(rect.top - PAD, -PAD);
  const bottom = Math.min(rect.bottom + PAD, window.innerHeight + PAD);
  return { left: rect.left - PAD, top, width: rect.width + 2 * PAD, height: Math.max(0, bottom - top) };
}

function sameBox(a: Box | null, b: Box | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Brings the part into view: centered, or from its top when it is taller than the screen. A short way
 * glides; a long one (the screen is a page away) jumps, because a smooth scroll over thousands of
 * pixels paints every photo on the way and is what makes a tour on a phone feel heavy.
 */
function scrollToPart(element: Element | null): void {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const tall = rect.height > window.innerHeight * 0.8;
  const wanted = tall ? 0 : (window.innerHeight - rect.height) / 2;
  const far = Math.abs(rect.top - wanted) > window.innerHeight * 1.5;
  element.scrollIntoView({
    block: tall ? "start" : "center",
    inline: "nearest",
    behavior: reducedMotion() || far ? "auto" : "smooth",
  });
}

/**
 * Finds the part a step lights, scrolls it into view, and follows it frame by frame while the step
 * is on screen (a panel opening, a window resizing, a smooth scroll settling). A part that never
 * appears leaves `box` null: the step then shows centered, with no spotlight.
 */
export function useTourTarget(step: TourStep | undefined, stepKey: string): TourTarget {
  const [target, setTarget] = useState<TourTarget>(NONE);

  useEffect(() => {
    const selector = step?.target;
    if (!step || !selector) {
      setTarget(NONE);
      return;
    }
    let cancelled = false;
    let frame = 0;
    let element: Element | null = null;
    let last: Box | null = null;
    const startedAt = performance.now();

    const follow = () => {
      if (cancelled) return;
      if (!element?.isConnected) element = document.querySelector(selector);
      if (element) {
        const box = boxOf(element);
        if (!sameBox(last, box)) {
          last = box;
          setTarget({ box, name: nameOf(element) });
        }
      } else if (last) {
        last = null;
        setTarget(NONE);
      } else if (performance.now() - startedAt > WAIT_MS) {
        setTarget(NONE);
      }
      frame = requestAnimationFrame(follow);
    };

    void (async () => {
      await step.prepare?.();
      if (cancelled) return;
      scrollToPart(document.querySelector(selector));
      follow();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // stepKey stands for the step: the tour is static data, so its identity is its position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  return target;
}
