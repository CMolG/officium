"use client";

import * as React from "react";

import { cn } from "../lib/cn";

/*
 * Radio — one choice of a set, joined to wait for a Save (Lib-Controls § Switch · Checkbox · Radio).
 *
 * A real `<input type="radio">` laid invisibly over a 22 px circle, so the browser keeps arrow-key
 * movement inside a `name` group, the form value and the label click. Selected is an ink circle with
 * a white center, unselected a white circle ringed by the control border: a center dot, not color
 * alone. Put the set in a `<fieldset>` with a `<legend>` (the group's name).
 *
 * `description` is the quiet second line ("Sticks to your sources."); a disabled choice states its
 * reason there ("Needs $0.50.").
 */

export interface RadioProps extends Omit<React.ComponentProps<"input">, "type" | "children"> {
  children: React.ReactNode;
  /** The second line under the label. */
  description?: React.ReactNode;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, children, description, ...props }, ref) => (
    <label className="flex cursor-pointer flex-row items-start gap-3 text-sm text-[color:var(--jd-ink)] has-[:disabled]:cursor-not-allowed has-[:disabled]:text-[color:var(--jd-ink)]/60">
      <span className="relative mt-px inline-flex shrink-0 flex-row">
        <input
          ref={ref}
          type="radio"
          data-jd-component="Radio"
          className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[22px] flex-row items-center justify-center rounded-full bg-[color:var(--jd-raised)]",
            "shadow-[inset_0_0_0_1px_var(--jd-control-border)] transition-colors duration-[var(--jd-dur-fast)]",
            "peer-hover:shadow-[inset_0_0_0_1.5px_var(--jd-ink)]",
            "peer-checked:bg-[color:var(--jd-ink)]",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--jd-focus)]",
            "peer-disabled:bg-[color:var(--jd-disabled)] peer-disabled:shadow-none",
            "after:size-2 after:scale-0 after:rounded-full after:bg-[color:var(--jd-page)] after:transition-transform",
            "peer-checked:after:scale-100 motion-reduce:after:transition-none",
            className,
          )}
        />
      </span>
      <span className="flex flex-col">
        <span className="font-medium">{children}</span>
        {description ? <span className="text-xs text-[color:var(--jd-faint)]">{description}</span> : null}
      </span>
    </label>
  ),
);
Radio.displayName = "Radio";

export { Radio };
