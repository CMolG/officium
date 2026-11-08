import type { ElementType, ReactNode } from "react";

import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { Text } from "./text";
import { TopBarWordmark } from "./top-bar-wordmark";

/** Where a page sits under its parent: the phone bar shows "Back to <parent>" and the page's own title. */
export interface TopBarTrail {
  back: { label: string; href: string };
  title: string;
}

/*
 * The top bar on a phone (Ole-Tools, Oec-Today): on the product's first page its wordmark, anywhere
 * deeper a 44 px back button ("Back to Vermilion") and the page's title; the actions stay on the right.
 * Internal to `ProductTopBar`.
 */
export function TopBarPhone({
  brand,
  wordmark,
  label,
  href,
  trail,
  actions,
  linkAs: LinkAs = "a",
}: {
  brand: string;
  wordmark: string;
  label: string;
  href: string;
  trail?: TopBarTrail | null;
  actions: ReactNode;
  linkAs?: ElementType;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[58px] flex-row items-center justify-between gap-2 border-b border-[color:var(--jd-line)] bg-[color:var(--jd-nav-bg)] pl-3.5 pr-1.5 backdrop-blur-[var(--jd-glass-blur)] sm:hidden">
      {trail ? (
        <span className="flex min-w-0 flex-row items-center gap-1">
          <IconButton large asChild aria-label={`Back to ${trail.back.label}`}>
            <LinkAs href={trail.back.href}>
              <Glyph name="chevron-left" size={20} />
            </LinkAs>
          </IconButton>
          <Text weight="bold" className="truncate">
            {trail.title}
          </Text>
        </span>
      ) : (
        <TopBarWordmark brand={brand} wordmark={wordmark} label={label} href={href} size={24} linkAs={LinkAs} />
      )}
      <span className="flex shrink-0 flex-row items-center gap-1">{actions}</span>
    </header>
  );
}
