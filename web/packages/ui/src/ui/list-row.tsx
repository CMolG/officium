import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";

/*
 * ListRow — one row of a list that goes somewhere or holds a setting (Lib-Controls `.lr`): 56 tall,
 * radius 14, white with a one-pixel soft edge, 15 / 500, the content on the left and the trailing
 * piece (a chevron, a switch, a value) on the right. It turns stone on hover when it is actionable.
 *
 * Make it the real element: `asChild` over an app's `<Link>` or a `<button>`, so the whole row is
 * the target and the keyboard and the router behave. As a plain `div` it is just a row.
 */

export interface ListRowProps extends ComponentProps<"div"> {
  asChild?: boolean;
  /** Draws the hover wash; set it when the row is a link or a button. */
  actionable?: boolean;
}

export function ListRow({ asChild = false, actionable = false, className, ...rest }: ListRowProps) {
  const Comp: React.ElementType = asChild ? Slot : "div";
  return (
    <Comp
      data-jd-component="ListRow"
      className={cn(
        "flex min-h-14 flex-row items-center justify-between gap-3 rounded-[14px] bg-[color:var(--jd-raised)] px-4",
        "text-[15px] font-medium text-[color:var(--jd-ink)] no-underline shadow-[var(--jd-shadow-1)]",
        actionable && "cursor-pointer transition-colors duration-[var(--jd-dur-fast)] hover:bg-[color:var(--jd-card)]",
        actionable && FOCUS_RING,
        className,
      )}
      {...rest}
    />
  );
}
