"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { Link } from "@javadaba/ui/navigation";
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger, Text } from "@javadaba/ui";

import { CATEGORY_CONFIG, categoryColor, categorySheetHref } from "../../lib/backlog/category-config";
import type { Category } from "../../lib/backlog/types";
import { ExcludeList, TickList, parsedGuide } from "../settings/CategoryGuideParts";

const HEADING = "font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.22em]";

/**
 * The card's "About this category" button and the compact modal it opens (JAVA-518, to JAVA-516's
 * design): what a card of this category must say before work starts, what done means, and where a
 * look-alike belongs instead -- then one way on, to the full sheet. Focus lands on the title when
 * it opens, and Radix hands it back to this button when it closes.
 */
export function CategoryInfoButton({ category }: { category: Category }) {
  const { label, hint } = CATEGORY_CONFIG[category];
  const guide = parsedGuide(category);
  const title = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="About this category"
          data-testid="category-info"
          className="flex size-11 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-md)] border-[1.5px] border-[color:var(--jd-ink)] font-[family-name:var(--font-jd-serif)] text-lg italic hover:bg-muted"
        >
          <Text aria-hidden="true">i</Text>
        </button>
      </DialogTrigger>
      <DialogContent
        sheetClose={false}
        className="flex max-w-xl flex-col gap-5"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          title.current?.focus();
        }}
      >
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <span aria-hidden="true" className="h-1 w-7 rounded-full" style={{ background: categoryColor(category) }} />
            <DialogTitle
              ref={title}
              tabIndex={-1}
              className="font-[family-name:var(--font-jd-display)] text-3xl font-black uppercase leading-[0.9] tracking-tight focus:outline-none"
            >
              {label}
              <span aria-hidden="true" style={{ color: categoryColor(category) }}>
                .
              </span>
            </DialogTitle>
            <DialogDescription className="text-sm text-[color:var(--jd-muted)]">{hint}</DialogDescription>
          </div>
          <DialogClose asChild>
            <Button type="button" register="ui" variant="outline" size="icon" aria-label="Close" className="size-11 shrink-0">
              <X size={18} aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 id="category-info-entry" className={HEADING}>
            Before work starts
          </h3>
          <TickList items={guide.entry} labelledBy="category-info-entry" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 id="category-info-exit" className={HEADING}>
            Done means
          </h3>
          <TickList items={guide.exit} labelledBy="category-info-exit" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 id="category-info-excludes" className={HEADING}>
            {`It isn't ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label.toLowerCase()} when`}
          </h3>
          <ExcludeList category={category} labelledBy="category-info-excludes" />
        </div>
        <Button asChild register="ui" className="min-h-11 w-full justify-center">
          <Link href={categorySheetHref(category)}>
            <Text>
              {`Open the ${label} sheet `}
              <Text aria-hidden="true">→</Text>
            </Text>
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
