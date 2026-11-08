import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

/** NavGroupLabel: the small capitals that name a group of `NavItem`s (Lib-Controls `.navg`): 10 px, 700, +14%, the faint ink. */
export function NavGroupLabel({ className, ...rest }: ComponentProps<"p">) {
  return (
    <p
      data-jd-component="NavGroupLabel"
      className={cn(
        "m-0 px-3 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--jd-faint)]",
        className,
      )}
      {...rest}
    />
  );
}
