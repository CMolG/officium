import type { ElementType } from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import type { ProductNavSection } from "./section-nav";
import { Text } from "./text";

/*
 * The sections in the bar's own row (Cur-Front "Product bar"): All Jobs, a thin rule, then the app's
 * sections as plain links. The current one is ink, semibold and underlined (three channels, never
 * color alone); the rule sits after any section that asks for it (`separatorAfter`), the way the
 * directory stands apart from the app. A bar this wide needs room, so it shows from `lg` up; below,
 * the same sections open from `ProductSectionsSheet`.
 */

export interface ProductSectionsInlineProps {
  sections: readonly ProductNavSection[];
  active?: string;
  linkAs?: ElementType;
  label: string;
  className?: string;
}

export function ProductSectionsInline({ sections, active, linkAs: LinkAs = "a", label, className }: ProductSectionsInlineProps) {
  return (
    <nav aria-label={label} className={cn("flex min-w-0 flex-row items-center gap-6", className)}>
      {sections.map((section) => {
        const current = section.disabled === undefined && section.id === active;
        const Tag: ElementType = section.plain ? "a" : LinkAs;
        const link =
          section.disabled === undefined ? (
            <Tag
              href={section.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-sm text-sm no-underline transition-colors duration-[var(--jd-dur-fast)]",
                "underline-offset-[8px] hover:text-[color:var(--jd-ink)] hover:underline hover:underline-offset-[6px]",
                FOCUS_RING,
                current
                  ? "font-semibold text-[color:var(--jd-ink)] underline decoration-2"
                  : "font-medium text-[color:var(--jd-muted)]",
              )}
            >
              <Text>{section.label}</Text>
            </Tag>
          ) : (
            <span role="link" aria-disabled="true" className="whitespace-nowrap text-sm font-medium text-[color:var(--jd-faint)]">
              <Text>{section.label}</Text>
            </span>
          );
        return (
          <span key={section.id} className="flex flex-row items-center gap-6">
            {link}
            {section.separatorAfter ? (
              <span aria-hidden="true" className="-mx-1.5 h-5 w-px shrink-0 bg-[color:var(--jd-ink)]/[0.14]" />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
