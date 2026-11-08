import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { Glyph } from "./glyph";

/*
 * SidebarBack -- the way out of a section that took the sidebar over (Lib-Chrome): a chevron and
 * "All sections" at the top of the section's own list. A real link or button (`asChild` takes the
 * router's `<Link>`), 40 px tall like the entries below it.
 */

export interface SidebarBackProps extends ComponentProps<"a"> {
  asChild?: boolean;
}

export function SidebarBack({ asChild = false, className, children, ...rest }: SidebarBackProps) {
  const Comp: React.ElementType = asChild ? Slot : "a";
  return (
    <Comp
      data-jd-component="SidebarBack"
      className={cn(
        "flex min-h-10 flex-row items-center gap-2 rounded-[var(--radius-jd-control)] px-3 text-[13px] font-medium no-underline",
        "text-[color:var(--jd-muted)] transition-colors duration-[var(--jd-dur-fast)]",
        "hover:bg-[color:var(--jd-ink)]/5 hover:text-[color:var(--jd-ink)]",
        FOCUS_RING,
        className,
      )}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <>
          <Glyph name="chevron-down" size={14} className="rotate-90" />
          {children}
        </>
      )}
    </Comp>
  );
}
