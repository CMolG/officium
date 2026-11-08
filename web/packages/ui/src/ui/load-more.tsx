import type { ComponentProps } from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";

/*
 * LoadMore (Lib-Pieces § Pagination): the bottom of a list that grows. One button that says how many more it
 * brings ("Load 20 more"), and under it how far the list has come ("40 of 132 shown."). When the new rows
 * arrive the CALLER moves focus to the first new row, so a keyboard user does not start again from the top;
 * the status line says so. While it loads the button is busy and a second press does nothing.
 */

export interface LoadMoreProps extends Omit<ComponentProps<"div">, "onClick"> {
  /** "Load 20 more" */
  label: string;
  /** "Loading" while the next rows come. */
  busyLabel?: string;
  /** "40 of 132 shown. Focus moves to the first new row." */
  status: string;
  loading?: boolean;
  onLoad: () => void;
}

export function LoadMore({ label, busyLabel, status, loading = false, onLoad, className, ...rest }: LoadMoreProps) {
  return (
    <div data-jd-component="LoadMore" className={cn("flex flex-col items-start gap-2", className)} {...rest}>
      <Button type="button" register="ui" variant="outline" busy={loading} onClick={onLoad}>
        {loading && busyLabel ? busyLabel : label}
      </Button>
      <span role="status" className="text-xs text-[color:var(--jd-faint)]">
        {status}
      </span>
    </div>
  );
}
