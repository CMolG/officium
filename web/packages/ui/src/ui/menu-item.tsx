import type { ComponentProps, ElementType } from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";

/*
 * MenuItem -- a row of the Javadaba menu's bottom half (Lib-Chrome `.mr`): 44 px, a glyph and a
 * label, "Account and settings", "Sign out". A link when it has an `href`, a button when it does not.
 * `@javadaba/account` builds the session's rows from it, so they look like the rest of the panel.
 */

type MenuItemProps<T extends ElementType> = { as?: T } & Omit<ComponentProps<T>, "as">;

export function MenuItem<T extends ElementType = "a">({ as, className, ...rest }: MenuItemProps<T>) {
  const Tag: ElementType = as ?? ("href" in rest ? "a" : "button");
  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      data-jd-component="MenuItem"
      className={cn(
        "flex min-h-11 w-full cursor-pointer flex-row items-center gap-3 rounded-[var(--radius-jd-control)] border-0 px-2.5",
        "text-left text-sm font-medium text-[color:var(--jd-ink)] transition-colors duration-[var(--jd-dur-fast)]",
        "hover:bg-[color:var(--jd-card)]",
        FOCUS_RING,
        className,
      )}
      {...rest}
    />
  );
}
