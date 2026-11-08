"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";

/*
 * Toggle — the two-state control that is NOT a switch (Lib-Controls § Toggle · ToggleGroup · Slider).
 *
 * `Switch` says "on/off" and lives in settings; this says "this option is selected" and lives in a
 * toolbar, so it looks like a button. PRESSED MEANS INK: a pressed toggle fills with the ink, which
 * is the maximum contrast the surface can give and reads without color. A disabled toggle keeps its
 * place and says why on hover and focus (`aria-disabled` instead of `disabled`). It paints `--toggle-rest`
 * (the page by default, the stone tray inside a `ToggleGroup`), so it never borrows a background.
 *
 * History: on a light surface the pressed state once could not be told apart from the normal one
 * (the toggle was written against shadcn names, one of which, `--accent`, was never defined). It is
 * written against the `--jd-*` tokens since 2026-08-11 and that is why it works on all four surfaces.
 */

const toggleVariants = cva(
  "inline-flex cursor-pointer flex-row items-center justify-center gap-2 rounded-[var(--radius-jd-control)] " +
    "bg-[color:var(--toggle-rest,var(--jd-page))] text-sm font-semibold text-[color:var(--jd-ink)] " +
    "transition-colors duration-[var(--jd-dur-fast)] " +
    "hover:bg-[color:color-mix(in_oklab,var(--jd-ink)_6%,var(--toggle-rest,var(--jd-page)))] " +
    FOCUS_RING +
    " " +
    // Pressed: the ink fills, so it reads without color on every surface.
    "data-[state=on]:bg-[color:var(--jd-ink)] data-[state=on]:text-[color:var(--jd-page)] data-[state=on]:hover:bg-[color:var(--jd-solid-hover)] " +
    // A disabled toggle keeps its place; WITH a reason (`aria-disabled`) it keeps the hover that shows it.
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[color:var(--toggle-rest,var(--jd-page))] disabled:text-[color:var(--jd-ink)]/40 " +
    "aria-disabled:cursor-not-allowed aria-disabled:text-[color:var(--jd-ink)]/40 aria-disabled:hover:bg-[color:var(--toggle-rest,var(--jd-page))] " +
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "",
        // The outline carries the 3:1 control border; pressed, it merges with the fill.
        outline:
          "shadow-[inset_0_0_0_1px_var(--jd-control-border)] data-[state=on]:shadow-[inset_0_0_0_1px_var(--jd-ink)]",
      },
      size: {
        default: "h-10 min-w-10 px-3",
        sm: "h-8 min-w-8 px-2.5 text-[13px]",
        lg: "h-12 min-w-12 px-4 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    data-jd-component="Toggle"
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
