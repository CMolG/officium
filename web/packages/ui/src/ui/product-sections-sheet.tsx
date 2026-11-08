"use client";

import type { ElementType } from "react";

import { IconButton } from "./icon-button";
import { NavItem } from "./nav-item";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./sheet";
import { SheetHeader } from "./sheet-header";
import type { ProductNavSection } from "./section-nav";
import { Text } from "./text";

/*
 * The sections on a phone (Cur-Front, Cur-Home): the bar's row has no room for them, so one icon
 * button named "<Product> sections" opens them as a bottom sheet, current one marked, and choosing
 * one closes the sheet (the bar outlives the navigation, so it would otherwise stay open).
 */

export interface ProductSectionsSheetProps {
  sections: readonly ProductNavSection[];
  active?: string;
  linkAs?: ElementType;
  label: string;
}

const ROWS = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);

export function ProductSectionsSheet({ sections, active, linkAs: LinkAs = "a", label }: ProductSectionsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <IconButton aria-label={label} large>
          {ROWS}
        </IconButton>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader closeLabel="Close">
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <nav aria-label={label} className="flex flex-col gap-1">
          {sections.map((section) => {
            const Tag: ElementType = section.plain ? "a" : LinkAs;
            if (section.disabled !== undefined) {
              return (
                <span key={section.id} role="link" aria-disabled="true" className="flex min-h-11 flex-col justify-center px-3 text-sm text-[color:var(--jd-faint)]">
                  <Text>{section.label}</Text>
                  <Text size="xs">{section.disabled}</Text>
                </span>
              );
            }
            return (
              <SheetClose key={section.id} asChild>
                <NavItem asChild current={section.id === active} className="min-h-11">
                  <Tag href={section.href}>
                    <Text>{section.label}</Text>
                  </Tag>
                </NavItem>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
