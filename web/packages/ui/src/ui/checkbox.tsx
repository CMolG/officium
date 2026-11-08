"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";

/*
 * Checkbox — joins the library to wait for a Save (Lib-Controls § Switch · Checkbox · Radio).
 *
 * A real `<input type="checkbox">` laid invisibly over a 22 px box with radius 6, so the browser keeps
 * the keyboard, the form value, the label click and the validity. Checked is an ink box with a white
 * tick, unchecked a white box ringed by the control border, so both read in grayscale: a tick, not
 * color alone. `indeterminate` (a "select all" that is partly on) draws a dash.
 *
 * With `children` it renders its own `<label>`; without, only the box, and the caller supplies an
 * `aria-label`. An invalid box shows the danger ring; `FieldError` says why under the group.
 */

export interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type" | "children"> {
  /** The label beside the box. */
  children?: React.ReactNode;
  /** A partly-on "select all": drawn as a dash, announced as mixed. */
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, children, indeterminate = false, ...props }, forwarded) => {
    const own = React.useRef<HTMLInputElement | null>(null);
    React.useEffect(() => {
      if (own.current) own.current.indeterminate = indeterminate;
    }, [indeterminate]);
    const setRefs = (node: HTMLInputElement | null) => {
      own.current = node;
      if (typeof forwarded === "function") forwarded(node);
      else if (forwarded) forwarded.current = node;
    };
    const box = (
      <span className="relative inline-flex shrink-0 flex-row">
        <input
          ref={setRefs}
          type="checkbox"
          data-jd-component="Checkbox"
          className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[22px] flex-row items-center justify-center rounded-md bg-[color:var(--jd-raised)] text-[color:var(--jd-page)]",
            "shadow-[inset_0_0_0_1px_var(--jd-control-border)] transition-colors duration-[var(--jd-dur-fast)]",
            "peer-hover:shadow-[inset_0_0_0_1.5px_var(--jd-ink)]",
            "peer-checked:bg-[color:var(--jd-ink)] peer-indeterminate:bg-[color:var(--jd-ink)]",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--jd-focus)]",
            "peer-aria-invalid:shadow-[inset_0_0_0_1.5px_var(--jd-danger)]",
            "peer-disabled:bg-[color:var(--jd-disabled)] peer-disabled:shadow-none peer-disabled:text-[color:var(--jd-ink)]/50",
            "[&>svg]:hidden peer-checked:[&>svg]:block peer-indeterminate:[&>svg]:block",
            className,
          )}
        >
          <Glyph name={indeterminate ? "minus" : "check"} size={14} />
        </span>
      </span>
    );
    if (children === undefined) return box;
    return (
      <label className="inline-flex cursor-pointer flex-row items-center gap-3 text-sm text-[color:var(--jd-ink)] has-[:disabled]:cursor-not-allowed has-[:disabled]:text-[color:var(--jd-ink)]/60">
        {box}
        <span>{children}</span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
