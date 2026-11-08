"use client";

import type { HTMLAttributes, Ref } from "react";

import { cn } from "../lib/cn";
import { useLayerMounted } from "../lib/use-layer-mounted";

/** The layer kinds the web has keyframes for (`tokens.css` has no `slide-out-left`). */
export type PresenceKind = "fade" | "pop" | "sheet" | "slide-right";

const ENTER: Record<PresenceKind, string> = {
  fade: "animate-jd-fade-in",
  pop: "animate-jd-pop-in",
  sheet: "animate-jd-sheet-in",
  "slide-right": "animate-jd-slide-in-right",
};

const EXIT: Record<PresenceKind, string> = {
  fade: "animate-jd-fade-out",
  pop: "animate-jd-pop-out",
  sheet: "animate-jd-sheet-out",
  "slide-right": "animate-jd-slide-out-right",
};

export interface PresenceProps extends HTMLAttributes<HTMLDivElement> {
  /** Entered while true; while false it plays its exit, then leaves the DOM. */
  open: boolean;
  kind: PresenceKind;
  /** Milliseconds before the entrance starts, for a stagger. */
  delay?: number;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A layer that plays the system's enter and exit when `open` flips. `data-state` says which, and a
 * closing layer is `inert` so a second press cannot land on it. It is the element itself, not a
 * wrapper: a call site swaps its own `motion` element for it and keeps its geometry classes. The
 * exit is timed, not listened for, because `animationend` never fires where animations are off.
 */
export function Presence({ open, kind, delay, className, style, ref, ...props }: PresenceProps) {
  const mounted = useLayerMounted(open);
  if (!mounted) return null;
  // While open, the finished entrance must not stay in effect: an animation in effect makes Chrome
  // a backdrop root, and the glass panels inside would stop blurring what is behind them.
  const timing = { animationFillMode: open ? "backwards" : undefined, animationDelay: delay ? `${delay}ms` : undefined };
  return (
    <div
      ref={ref}
      data-state={open ? "open" : "closed"}
      inert={open ? undefined : true}
      className={cn(open ? ENTER[kind] : EXIT[kind], className)}
      style={{ ...style, ...timing }}
      {...props}
    />
  );
}
