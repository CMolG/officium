import * as React from "react";

import { cn } from "../lib/cn";

/*
 * Accordion (Lib-Pieces § Accordion): questions that open in place. Each item is a heading holding ONE
 * button (`aria-expanded`, `aria-controls`) over a region; the chevron turns, never the layout. An item that
 * cannot open yet is `disabled` and keeps its reason under its title ("Arrives with Tributa's release."), so
 * it is never a dead control. Items are independent: opening one does not close another.
 */

export function Accordion({ className, ...rest }: React.ComponentProps<"div">) {
  return (
    <div
      data-jd-component="Accordion"
      className={cn("flex flex-col divide-y divide-[color:var(--jd-line)] border-y border-[color:var(--jd-line)]", className)}
      {...rest}
    />
  );
}
