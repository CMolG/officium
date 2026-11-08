"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { FIELD_FOCUS_RING } from "../lib/focus-ring";

/*
 * Input — the ecosystem's field (Lib-Controls § Input).
 *
 * The border is `--jd-control-border`, not `--jd-line`: a field's border is the only signal that
 * you can type there, so it gets WCAG 1.4.11's 3:1 minimum (the 8% hairline is decoration). The
 * white `--jd-raised` fill sits on the washi page, 44 tall, radius 10, and its states are all drawn
 * without color alone: hover darkens the edge to ink, focus adds the ink ring, an invalid field
 * thickens its edge to 1.5 px in the danger red (and `FieldError` names the fix under it), a
 * read-only one turns to stone with no edge, a disabled one dims.
 *
 * Two registers, the same as `Button`: `ui` is the field of an app at work; `cta` is the pill, 52
 * tall, which only ever sits beside a pill button on the website.
 *
 * `text-base` on a phone: below 16 px, Safari on iOS zooms in when you focus a field and throws
 * off the page's layout. From `md` up it steps to the design's 15.
 */

export interface InputProps extends React.ComponentProps<"input"> {
  /** `cta` is the pill field of the website's marketing register. */
  register?: "ui" | "cta";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, register = "ui", ...props }, ref) => {
    return (
      <input
        type={type}
        data-jd-component="Input"
        className={cn(
          "block w-full border bg-[color:var(--jd-raised)] text-base md:text-[15px]",
          register === "cta"
            ? "min-h-[52px] rounded-full px-[18px]"
            : "min-h-11 rounded-[var(--radius-jd-control)] px-3.5",
          "border-[color:var(--jd-control-border)] text-[color:var(--jd-ink)]",
          "placeholder:text-[color:var(--jd-faint)] caret-[color:var(--jd-ink)]",
          "transition-[border-color,background-color] duration-[var(--jd-dur-fast)]",
          "hover:border-[color:var(--jd-ink)] focus:border-[color:var(--jd-ink)]",
          FIELD_FOCUS_RING,
          "aria-invalid:border-[1.5px] aria-invalid:border-[color:var(--jd-danger)]",
          "read-only:border-transparent read-only:bg-[color:var(--jd-card)]",
          "disabled:cursor-not-allowed disabled:border-[color:var(--jd-ink)]/20 disabled:bg-[color:var(--jd-card)] disabled:text-[color:var(--jd-ink)]/55",
          "file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-[color:var(--jd-ink)]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
