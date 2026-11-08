import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

/*
 * Table — a plain table in the house type (Lib-Controls `.tbl`). Write the semantic markup
 * (`<thead><tr><th>`, `<tbody>`, `<td>`); the skin comes from this wrapper: column heads are 10 px
 * capitals in the faint ink with a 12% rule, cells are 14 px with a 6% rule, and a numeric column
 * (`data-num` on its `th` and `td`) is right-aligned in tabular figures so digits line up.
 *
 * It scrolls sideways inside its own box on a narrow screen instead of breaking the page (`stickyFirst` pins
 * the first column). Sortable heads are `SortHead`; the row of selection and range above it is `SelectionBar`. A table
 * that is the thing being worked on sits in a `Panel material="raised"`. Give it a `<caption>`
 * (sr-only is fine) so assistive tech knows what it holds.
 */

export interface TableProps extends ComponentProps<"table"> {
  /** Keeps the first column in view while the rest scrolls sideways, as a phone does (Lib-Pieces § Table). */
  stickyFirst?: boolean;
}

export function Table({ className, children, stickyFirst = false, ...rest }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        data-jd-component="Table"
        className={cn(
          "w-full border-collapse text-sm text-[color:var(--jd-ink)]",
          "[&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[color:var(--jd-ink)]/12 [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left",
          "[&_th]:text-[10px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-[color:var(--jd-faint)]",
          "[&_td]:border-b [&_td]:border-[color:var(--jd-ink)]/6 [&_td]:px-3.5 [&_td]:py-3 [&_td]:align-middle",
          "[&_[data-num]]:text-right [&_[data-num]]:tabular-nums",
          stickyFirst && "[&_tr>:first-child]:sticky [&_tr>:first-child]:left-0 [&_tr>:first-child]:bg-[color:var(--jd-page)]",
          className,
        )}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}
