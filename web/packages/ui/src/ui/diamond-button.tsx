"use client";

import type { ComponentProps } from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { DiamondMark } from "./diamond-mark";

/*
 * DiamondButton — the diamond menu button (Lib-Controls `.dia`): a 44 px round ghost button that
 * holds the diamond and, when something is waiting, its badge dot. Hover washes it at 8% ink. Its
 * accessible name is REQUIRED and should carry the count ("Javadaba menu, 3 unread notifications"),
 * because the dot itself is hidden from assistive tech.
 */

export interface DiamondButtonProps extends Omit<ComponentProps<"button">, "aria-label" | "children"> {
  "aria-label": string;
  /** White diamond, for an ink bar. */
  onInk?: boolean;
  /** Unread count on the dot. */
  count?: number;
}

export function DiamondButton({ onInk, count, className, type = "button", ...rest }: DiamondButtonProps) {
  return (
    <button
      type={type}
      data-jd-component="DiamondButton"
      className={cn(
        "relative flex size-11 shrink-0 cursor-pointer flex-row items-center justify-center rounded-full bg-transparent p-0",
        "transition-colors duration-[var(--jd-dur-fast)] hover:bg-[color:var(--jd-ink)]/8",
        FOCUS_RING,
        className,
      )}
      {...rest}
    >
      <DiamondMark onInk={onInk} count={count} />
    </button>
  );
}
