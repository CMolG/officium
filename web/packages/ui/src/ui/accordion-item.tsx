"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { useControllable } from "../lib/use-controllable";
import { Glyph } from "./glyph";

/** One question of an `Accordion` (Lib-Pieces § Accordion): a heading holding ONE button over a region. */
export interface AccordionItemProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The question. */
  title: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Cannot open yet. Say why in `reason`. */
  disabled?: boolean;
  reason?: React.ReactNode;
  /** The heading level of the item's title. Default 3. */
  level?: 2 | 3 | 4;
}

export function AccordionItem({ title, open, defaultOpen = false, onOpenChange, disabled = false, reason, level = 3, className, children, ...rest }: AccordionItemProps) {
  const [expanded, setExpanded] = useControllable(open, defaultOpen, onOpenChange);
  const id = React.useId();
  const Heading: React.ElementType = `h${level}`;
  return (
    <div data-jd-component="AccordionItem" data-state={expanded && !disabled ? "open" : "closed"} className={className} {...rest}>
      <Heading className="m-0">
        <button
          type="button"
          id={`${id}-button`}
          aria-expanded={expanded && !disabled}
          aria-controls={`${id}-region`}
          aria-disabled={disabled || undefined}
          onClick={() => !disabled && setExpanded(!expanded)}
          className={cn(
            "flex min-h-14 w-full cursor-pointer flex-row items-center justify-between gap-4 px-5 text-left text-[15px] font-semibold text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-ink)]/[0.03]",
            "aria-disabled:cursor-not-allowed aria-disabled:text-[color:var(--jd-ink)]/50",
            FOCUS_RING,
          )}
        >
          <span className="flex min-w-0 flex-col">
            {title}
            {disabled && reason ? <span className="text-xs font-normal text-[color:var(--jd-faint)]">{reason}</span> : null}
          </span>
          <Glyph name="chevron-down" size={18} className={cn("motion-safe:transition-transform motion-safe:duration-[var(--jd-dur-fast)]", expanded && !disabled && "rotate-180")} />
        </button>
      </Heading>
      <div id={`${id}-region`} role="region" aria-labelledby={`${id}-button`} hidden={!expanded || disabled} className="px-5 pb-5 text-sm leading-[1.55] text-[color:var(--jd-muted)]">
        {children}
      </div>
    </div>
  );
}
