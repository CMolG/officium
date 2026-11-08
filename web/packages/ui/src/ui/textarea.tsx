"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { FIELD_FOCUS_RING } from "../lib/focus-ring";

/*
 * Textarea — the ecosystem's multi-line field (Lib-Controls § Input · Textarea · Label).
 *
 * It mirrors `Input` exactly (same control border, same states, same focus ring) so a form mixing
 * both reads as one family. A counter such as "63 / 500" goes under it as a `FieldHelp`.
 */

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-jd-component="Textarea"
        className={cn(
          "block min-h-24 w-full rounded-[var(--radius-jd-control)] border px-3.5 py-2.5 text-base md:text-[15px]",
          "border-[color:var(--jd-control-border)] bg-[color:var(--jd-raised)]",
          "text-[color:var(--jd-ink)] placeholder:text-[color:var(--jd-faint)] caret-[color:var(--jd-ink)]",
          "transition-[border-color,background-color] duration-[var(--jd-dur-fast)]",
          "hover:border-[color:var(--jd-ink)] focus:border-[color:var(--jd-ink)]",
          FIELD_FOCUS_RING,
          "aria-invalid:border-[1.5px] aria-invalid:border-[color:var(--jd-danger)]",
          "read-only:border-transparent read-only:bg-[color:var(--jd-card)]",
          "disabled:cursor-not-allowed disabled:border-[color:var(--jd-ink)]/20 disabled:bg-[color:var(--jd-card)] disabled:text-[color:var(--jd-ink)]/55",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
