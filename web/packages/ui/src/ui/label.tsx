"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "../lib/cn";

/*
 * Label — a field's name (Lib-Controls § Input · Textarea · Label). It sits ABOVE the field, always
 * visible, 13 / 600. Required is the default, so a field that is not says so with `optional`.
 */

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Adds the quiet "optional" after the name. */
  optional?: boolean;
}

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, optional, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "text-[13px] font-semibold leading-snug text-[color:var(--jd-ink)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      data-jd-component="Label"
      {...props}
    >
      {children}
      {optional ? <small className="ml-1.5 text-xs font-medium text-[color:var(--jd-faint)]">optional</small> : null}
    </LabelPrimitive.Root>
  ),
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
