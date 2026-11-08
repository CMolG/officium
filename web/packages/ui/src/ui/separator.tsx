"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "../lib/cn";

/*
 * Separator — a hairline at 8% ink (Lib-Display § Separator). Decoration only. Horizontal between
 * blocks, vertical between toolbar groups, and with a `label` ("or") between two ways in.
 */

const LINE = "shrink-0 bg-[color:var(--jd-line)]";

export interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  /** A word set in the line, between two ways in: "or". Horizontal only. */
  label?: string;
}

const Separator = React.forwardRef<React.ElementRef<typeof SeparatorPrimitive.Root>, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, label, ...props }, ref) => {
    if (label && orientation === "horizontal") {
      return (
        <div role="separator" aria-label={label} className={cn("flex w-full flex-row items-center gap-3", className)}>
          <span className={cn(LINE, "h-px flex-1")} />
          <span aria-hidden="true" className="text-xs text-[color:var(--jd-faint)]">
            {label}
          </span>
          <span className={cn(LINE, "h-px flex-1")} />
        </div>
      );
    }
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(LINE, orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
        {...props}
      />
    );
  },
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
