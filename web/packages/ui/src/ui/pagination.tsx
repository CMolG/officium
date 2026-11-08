"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { Glyph } from "./glyph";
import { pageSlots } from "./pagination.shared";

/*
 * Pagination (Lib-Pieces § Breadcrumb · Pagination): which part of how many. The current page is ink on white
 * (`aria-current="page"`); previous and next are named for their destination; "…" stands for the pages left out.
 * Say the range in words beside it ("Jobs 21 to 40 of 132"). Lists that grow from the bottom use `LoadMore`
 * instead. A pager that links (`hrefFor`) draws real links, so a crawler and middle-click work.
 */

export interface PaginationProps extends Omit<React.ComponentProps<"nav">, "onChange"> {
  /** The current page, 1-based. */
  page: number;
  pageCount: number;
  /** Told the page asked for (a button pager). */
  onPageChange?: (page: number) => void;
  /** A link pager: the address of a page. Takes precedence over `onPageChange`. */
  hrefFor?: (page: number) => string;
  /** The landmark's name, and the words of previous and next. */
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
  /** The link element for `hrefFor`; `a` by default. */
  linkComponent?: React.ElementType;
}

const CELL =
  "inline-flex h-10 min-w-10 cursor-pointer flex-row items-center justify-center rounded-[var(--radius-jd-control)] px-2.5 text-sm font-semibold tabular-nums text-[color:var(--jd-ink)] no-underline " +
  "hover:bg-[color:var(--jd-hover)] aria-[current=page]:bg-[color:var(--jd-ink)] aria-[current=page]:text-[color:var(--jd-page)] aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-40 pointer-coarse:h-11 pointer-coarse:min-w-11 " +
  FOCUS_RING;

export function Pagination({
  page,
  pageCount,
  onPageChange,
  hrefFor,
  label = "Pages",
  previousLabel = "Previous page",
  nextLabel = "Next page",
  linkComponent: Link = "a",
  className,
  ...rest
}: PaginationProps) {
  const go = (target: number, content: React.ReactNode, props: { "aria-label"?: string; "aria-current"?: "page" }) => {
    const reachable = target >= 1 && target <= pageCount;
    if (hrefFor && reachable) {
      return (
        <Link href={hrefFor(target)} className={CELL} {...props}>
          {content}
        </Link>
      );
    }
    return (
      <button type="button" aria-disabled={!reachable || undefined} className={CELL} onClick={() => reachable && onPageChange?.(target)} {...props}>
        {content}
      </button>
    );
  };
  return (
    <nav aria-label={label} data-jd-component="Pagination" className={cn("flex flex-row flex-wrap items-center gap-1", className)} {...rest}>
      {go(page - 1, <Glyph name="chevron-left" size={16} />, { "aria-label": previousLabel })}
      {pageSlots(page, pageCount).map((slot, index) =>
        slot === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-xs text-[color:var(--jd-faint)]">
            …
          </span>
        ) : (
          <React.Fragment key={slot}>{go(slot, slot, slot === page ? { "aria-current": "page" } : {})}</React.Fragment>
        ),
      )}
      {go(page + 1, <Glyph name="chevron-right" size={16} />, { "aria-label": nextLabel })}
    </nav>
  );
}
