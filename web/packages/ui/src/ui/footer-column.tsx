import type { ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { linkKey, linkTag, type ProductNavLink } from "./javadaba-links";
import { Text } from "./text";

/** The footer's link style (Lib-Chrome `.flk`): 14 px, muted, underlined on hover, 32 px tall. */
export const FOOTER_LINK = cn(
  "inline-flex min-h-8 flex-row items-center rounded-sm text-sm text-[color:var(--jd-muted)] underline-offset-4",
  "transition-colors duration-[var(--jd-dur-fast)] hover:text-[color:var(--jd-ink)] hover:underline",
  FOCUS_RING,
);

/**
 * One column of the footer: a small-capitals title over a list of links, and optionally a control
 * after them (the consent button is a button, never a link to a page).
 */
export function FooterColumn({
  title,
  links,
  linkAs: LinkAs = "a",
  after,
  lang,
}: {
  title: string;
  links: readonly ProductNavLink[];
  linkAs?: ElementType;
  after?: ReactNode;
  lang?: string;
}) {
  return (
    <nav aria-label={title} lang={lang} className="flex min-w-0 flex-col gap-1">
      <span className="pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--jd-faint)]">{title}</span>
      {links.map((link) => {
        const Tag = linkTag(link, LinkAs);
        return (
          <Tag key={linkKey(link)} href={link.href} className={FOOTER_LINK}>
            <Text>{link.label}</Text>
          </Tag>
        );
      })}
      {after}
    </nav>
  );
}
