"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";

/*
 * IconButton: the 40 px square that holds one glyph (Lib-Controls `.ib`): the reveal inside a
 * password field, a toolbar's close, a row's more. It has no label of its own, so `aria-label` is
 * REQUIRED: the type refuses an icon button nobody can name. `large` is the 44 px of a touch toolbar.
 */

export interface IconButtonProps extends Omit<React.ComponentProps<"button">, "aria-label"> {
  "aria-label": string;
  /** 44 px instead of 40. */
  large?: boolean;
  asChild?: boolean;
}

export function IconButton({ className, large = false, asChild = false, type, ...props }: IconButtonProps) {
  const Comp: React.ElementType = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      data-jd-component="IconButton"
      className={cn(
        "flex shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-control)] p-0 text-[color:var(--jd-ink)]",
        "transition-colors duration-[var(--jd-dur-fast)] hover:bg-[color:var(--jd-hover)]",
        "disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none",
        FOCUS_RING,
        large ? "size-11" : "size-10 pointer-coarse:size-11",
        className,
      )}
      {...props}
    />
  );
}
