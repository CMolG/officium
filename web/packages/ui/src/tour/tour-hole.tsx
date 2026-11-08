"use client";

import { useLayoutEffect, useRef } from "react";

import { cn } from "../lib/cn";

import type { Box } from "./placement";

/*
 * The lit box of the spotlight. It sits at the screen's corner and is translated into place, so a glide
 * costs the compositor and no layout: a jump to a part of another place or size plays from where the old
 * box was (scaled and translated) to where the new one is, and a box that only follows its part (a scroll
 * settling, a panel opening) is placed at once, with no glide.
 */

/** A move this far (px), or any change of size beyond a pixel, is a new part to glide to, not a part being followed. */
const GLIDE_FROM = 96;
const GLIDE_MS = 250;

const placeAt = (box: Box): string => `translate(${box.left}px, ${box.top}px)`;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TourHole({ box, className }: { box: Box; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const was = useRef<Box | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const before = was.current;
    was.current = box;
    if (!element || !before || reducedMotion() || typeof element.animate !== "function") return;
    const resized = Math.abs(before.width - box.width) > 1 || Math.abs(before.height - box.height) > 1;
    const moved = Math.hypot(before.left - box.left, before.top - box.top) > GLIDE_FROM;
    if (!resized && !moved) return;
    const from = `${placeAt(before)} scale(${before.width / box.width}, ${before.height / box.height})`;
    element.animate([{ transform: from }, { transform: `${placeAt(box)} scale(1, 1)` }], {
      duration: GLIDE_MS,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [box]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-jd-tour-hole=""
      className={cn(
        "pointer-events-none fixed left-0 top-0 origin-top-left rounded-2xl shadow-[0_0_0_9999px_rgba(17,17,17,0.45),0_0_0_3px_#ffffff]",
        className,
      )}
      style={{ width: box.width, height: box.height, transform: placeAt(box) }}
    />
  );
}

