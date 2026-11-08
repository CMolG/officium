import type { ComponentProps } from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { Glyph } from "./glyph";

/*
 * SortHead: a sortable column head for `Table` (Lib-Pieces § Table). It says its order in words to screen
 * readers (`aria-sort` on the `<th>`, plus the spoken state on the button) and with an arrow on screen. Pressing
 * it asks for the next order; the caller keeps the order and re-sorts. Numeric columns pass `data-num`.
 */

export type SortDirection = "none" | "ascending" | "descending";

export interface SortHeadLabels {
  none: string;
  ascending: string;
  descending: string;
}

const DEFAULT_LABELS: SortHeadLabels = { none: "not sorted", ascending: "sorted ascending", descending: "sorted descending" };

const ARROW = { none: "sort", ascending: "arrow-up", descending: "arrow-down" } as const;

export interface SortHeadProps extends Omit<ComponentProps<"th">, "aria-sort"> {
  direction?: SortDirection;
  /** Asked for the next order. */
  onSort: () => void;
  labels?: Partial<SortHeadLabels>;
}

export function SortHead({ direction = "none", onSort, labels, className, children, ...rest }: SortHeadProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  return (
    <th data-jd-component="SortHead" aria-sort={direction} className={className} {...rest}>
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex min-h-8 cursor-pointer flex-row items-center gap-1.5 rounded-sm border-0 p-0 text-inherit [font:inherit] [letter-spacing:inherit] [text-transform:inherit] hover:text-[color:var(--jd-ink)]",
          FOCUS_RING,
        )}
      >
        {children}
        <Glyph name={ARROW[direction]} size={14} />
        <span className="sr-only">, {text[direction]}</span>
      </button>
    </th>
  );
}
