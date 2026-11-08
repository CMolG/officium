import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";

/*
 * NavItem — one entry of a side navigation (Lib-Controls `.nav`): 40 tall, radius 10, 14 / 500 in the
 * muted ink, a gentle wash on hover. The current page is marked twice: a white (raised) pill with a
 * hair of shadow AND a heavier weight, so it reads without color. `current` writes `aria-current="page"`.
 *
 * Put the router's `<Link>` inside with `asChild`; an icon and the label go in as its children.
 *
 * `folded` is the entry of a folded rail (Lib-Chrome): a 44 px target that shows only its icon. Wrap the
 * label in an element (a `<span>`) so it can be hidden, and give the link its own `aria-label`.
 */

export interface NavItemProps extends ComponentProps<"a"> {
  asChild?: boolean;
  /** This entry is the page the person is on. */
  current?: boolean;
  /** The icon-only entry of a folded rail. */
  folded?: boolean;
}

export function NavItem({ asChild = false, current = false, folded = false, className, ...rest }: NavItemProps) {
  const Comp: React.ElementType = asChild ? Slot : "a";
  return (
    <Comp
      data-jd-component="NavItem"
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex min-h-10 flex-row items-center gap-3 rounded-[var(--radius-jd-control)] px-3 text-sm font-medium no-underline",
        "text-[color:var(--jd-muted)] transition-colors duration-[var(--jd-dur-fast)]",
        "hover:bg-[color:var(--jd-ink)]/5 hover:text-[color:var(--jd-ink)]",
        FOCUS_RING,
        "aria-[current=page]:bg-[color:var(--jd-raised)] aria-[current=page]:font-semibold aria-[current=page]:text-[color:var(--jd-ink)]",
        "aria-[current=page]:shadow-[0_1px_2px_rgba(17,17,17,0.06)] [&_svg]:shrink-0",
        folded && "size-11 justify-center px-0 [&>:not(svg)]:hidden",
        className,
      )}
      {...rest}
    />
  );
}
