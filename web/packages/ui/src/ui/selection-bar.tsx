import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/cn";

/*
 * SelectionBar: the row above a table that says what is selected and what can be done to it (Lib-Pieces §
 * Table): "2 selected", the actions that apply to the selection (outline and ghost buttons that repeat the
 * count: "Download 2 as one"), and, at the end, where the page is in the list ("Showing 1 to 5 of 132").
 * With nothing selected only the range shows. The count is a live status so a selection is announced.
 */

export interface SelectionBarProps extends Omit<ComponentProps<"div">, "children"> {
  /** "2 selected", or empty when nothing is. */
  selected?: string;
  /** The actions for the selection (`Button`s). */
  actions?: ReactNode;
  /** "Showing 1 to 5 of 132". */
  range?: string;
}

export function SelectionBar({ selected, actions, range, className, ...rest }: SelectionBarProps) {
  return (
    <div data-jd-component="SelectionBar" className={cn("flex min-h-11 flex-row flex-wrap items-center justify-between gap-3", className)} {...rest}>
      <div className="flex flex-row flex-wrap items-center gap-3">
        <span role="status" className="text-sm font-semibold text-[color:var(--jd-ink)]">
          {selected}
        </span>
        {selected ? actions : null}
      </div>
      {range ? <span className="text-xs text-[color:var(--jd-faint)]">{range}</span> : null}
    </div>
  );
}
