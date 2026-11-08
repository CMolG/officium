import type { ReactNode } from "react";

import { cn } from "../lib/cn";

/*
 * DiamondMark — the diamond and its badge dot, drawn (Lib-Controls `.dia` / `.dot`), without the
 * button around it. A 16 px square turned 45 degrees, in the ink (or white on an ink bar), and at
 * its top right the count of what is waiting, as a 20 px ink disc with a ring in the page color so
 * it separates from whatever is behind it. The NUMBER is the signal, not the color.
 *
 * `DiamondButton` wraps it in a button; the Javadaba menu's `<summary>` wraps it in its own element.
 * Both put it inside a `relative` 44 px box.
 */

export interface DiamondMarkProps {
  /** White diamond, for an ink bar. */
  onInk?: boolean;
  /** How many things are waiting. 0 or undefined draws no dot; above 9 reads "9+". */
  count?: number;
  className?: string;
  /** Draws this in place of the plain diamond, keeping the dot: the Javadaba menu wears the seal (`MenuDiamond`). */
  mark?: ReactNode;
}

export function DiamondMark({ onInk = false, count, className, mark }: DiamondMarkProps) {
  return (
    <>
      {mark ?? <i
        aria-hidden="true"
        className={cn(
          "block size-4 rotate-45 rounded-[2px]",
          onInk ? "bg-white" : "bg-[color:var(--jd-ink)]",
          className,
        )}
      />}
      {count && count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex h-5 min-w-5 flex-row items-center justify-center rounded-full bg-[color:var(--jd-ink)] px-[5px] text-[11px] font-bold leading-none text-[color:var(--jd-page)] shadow-[0_0_0_2px_var(--jd-page)]"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </>
  );
}
