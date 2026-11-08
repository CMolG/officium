import type { ElementType } from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import type { ProductNavLink } from "./javadaba-links";
import { Text } from "./text";

/*
 * SubNav -- the bar's third level (Lib-Chrome `.t3`): views of the section you are in ("All cards",
 * "Mine", "Agents", "Blocked"). Quiet pills under the sections; the current one is a stone chip with
 * semibold ink, so the place is told by weight and shape, not by color alone. No state, so it renders
 * on SSR pages. Tools that need the height fold it into the page.
 */

export interface SubNavItem extends ProductNavLink {
  id: string;
}

export interface SubNavProps {
  items: readonly SubNavItem[];
  /** The `id` of the current view. */
  active?: string;
  /** The nav's accessible name. */
  label?: string;
  /** The app's own `<Link>`; an item with `plain` is always an `<a>`. */
  linkAs?: ElementType;
  className?: string;
}

export function SubNav({ items, active, label = "Views", linkAs: LinkAs = "a", className }: SubNavProps) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label={label}
      className={cn(
        "flex flex-row min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const current = item.id === active;
        const Tag: ElementType = item.plain ? "a" : LinkAs;
        return (
          <Tag
            key={item.id}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 flex-row items-center rounded-[var(--radius-jd-pill)] px-3 text-[13px] whitespace-nowrap",
              "transition-colors duration-[var(--jd-dur-fast)]",
              current
                ? "bg-[color:var(--jd-card)] font-semibold text-[color:var(--jd-ink)]"
                : "font-medium text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-hover)] hover:text-[color:var(--jd-ink)]",
              FOCUS_RING,
            )}
          >
            <Text>{item.label}</Text>
          </Tag>
        );
      })}
    </nav>
  );
}
