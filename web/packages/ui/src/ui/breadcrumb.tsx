"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import type { BreadcrumbItem } from "./breadcrumb.shared";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/*
 * Breadcrumb (Lib-Pieces § Breadcrumb · Pagination): where am I. The trail starts at the PRODUCT, not at
 * Javadaba. The current page is the last crumb and is not a link (`aria-current="page"`). On a phone a long
 * trail folds its middle into a menu button ("Show 2 more levels") that lists them; from `sm` up it shows
 * every level. The same trail goes to a content page's structured data with `breadcrumbJsonLd`.
 */

export interface BreadcrumbProps extends React.ComponentProps<"nav"> {
  items: BreadcrumbItem[];
  /** The landmark's name. */
  label?: string;
  /** The fold button's name, told how many levels it hides. */
  moreLabel?: (count: number) => string;
  /** The link element: `a` by default; an app passes its router's link (it receives `href`). */
  linkComponent?: React.ElementType;
}

const CRUMB =
  "inline-flex min-h-8 flex-row items-center rounded-sm text-sm text-[color:var(--jd-muted)] no-underline hover:text-[color:var(--jd-ink)] hover:underline hover:underline-offset-4 pointer-coarse:min-h-11 " +
  FOCUS_RING;

export function Breadcrumb({ items, label = "Breadcrumb", moreLabel = (count) => `Show ${count} more ${count === 1 ? "level" : "levels"}`, linkComponent: Link = "a", className, ...rest }: BreadcrumbProps) {
  const last = items.length - 1;
  const foldable = items.length > 3;
  const middle = foldable ? items.slice(1, last) : [];
  return (
    <nav aria-label={label} data-jd-component="Breadcrumb" className={className} {...rest}>
      <ol className="m-0 flex list-none flex-row flex-wrap items-center gap-x-1.5 p-0">
        {items.map((item, index) => {
          const folded = foldable && index > 0 && index < last;
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <li aria-hidden="true" className={cn("text-sm text-[color:var(--jd-faint)]", folded && index > 1 && "max-sm:hidden")}>
                  <span>/</span>
                </li>
              )}
              {/* The fold button takes the place of the middle levels, on a phone only. */}
              {foldable && index === 1 && (
                <li className="sm:hidden">
                  <Popover>
                    <PopoverTrigger asChild>
                      <IconButton aria-label={moreLabel(middle.length)}>
                        <Glyph name="more" size={18} />
                      </IconButton>
                    </PopoverTrigger>
                    <PopoverContent className="p-1.5">
                      <ul className="m-0 flex list-none flex-col p-0">
                        {middle.map((crumb) => (
                          <li key={crumb.label}>
                            <Link href={crumb.href} className={cn(CRUMB, "w-full px-2.5")}>
                              {crumb.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </li>
              )}
              <li className={cn(folded && "max-sm:hidden")}>
                {index === last || !item.href ? (
                  <span aria-current={index === last ? "page" : undefined} className="inline-flex min-h-8 flex-row items-center text-sm font-semibold text-[color:var(--jd-ink)]">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className={CRUMB}>
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
