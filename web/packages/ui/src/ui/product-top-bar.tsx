import type { ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";
import type { ProductNavSection } from "./section-nav";
import { TopBarPhone, type TopBarTrail } from "./top-bar-phone";
import { TopBarWordmark } from "./top-bar-wordmark";

/*
 * ProductTopBar -- the bar Oleum and Oeconomicis share (Ole-Page, Oec-Page, wave 7, MIG-A60): the
 * seal and wordmark, the product's places inline as plain links with the current one underlined, a
 * search to the right and the Javadaba menu last. From `sm` up it is one 64 px bar; on a phone it is
 * the 58 px one, with a back button and the page's title below the first page.
 *
 * It is the frame, not the content: it imports no product, knows no router (`linkAs` is the app's
 * `<Link>`) and owns no search or menu. The product hands in its search field (`search`), its actions
 * (`actions`: its own sections menu for the places that do not fit, the Javadaba menu) and, for a phone,
 * the page's trail and its own actions. Under `lg` the inline places hide: `actions` carries them.
 */
export interface ProductTopBarProps {
  /** Brand slug in `@javadaba/brand`'s registry. */
  brand: string;
  /** The wordmark's text, upper-cased by the bar. Defaults to the slug. */
  wordmark?: string;
  /** The wordmark link's accessible name ("Oleum, colors"). Defaults to the wordmark. */
  label?: string;
  /** Where the wordmark goes: the product's first page. */
  href?: string;
  /** The product's places, drawn inline from `lg` up. */
  sections?: readonly ProductNavSection[];
  /** `id` of the current place. */
  active?: string;
  /** The inline nav's accessible name. Defaults to the wordmark. */
  navLabel?: string;
  /** The search field, to the right of the places (from `sm` up). */
  search?: ReactNode;
  /** The controls after the search: the places' menu, the Javadaba menu. */
  actions: ReactNode;
  /** On a phone, where this page sits under its parent. Omitted on the product's first page. */
  trail?: TopBarTrail | null;
  /** On a phone, the controls on the right (search, the places' menu, the Javadaba menu). */
  phoneActions: ReactNode;
  /** The app's `<Link>`. Defaults to `<a>`. */
  linkAs?: ElementType;
  className?: string;
}

export function ProductTopBar({
  brand,
  wordmark,
  label,
  href = "/",
  sections,
  active,
  navLabel,
  search,
  actions,
  trail,
  phoneActions,
  linkAs: LinkAs = "a",
  className,
}: ProductTopBarProps) {
  const name = (wordmark ?? brand).toUpperCase();
  const accessibleName = label ?? name;
  return (
    <>
      <header
        data-jd-component="ProductTopBar"
        className={cn(
          "sticky top-0 z-40 flex h-16 flex-row items-center gap-6 border-b border-[color:var(--jd-line)] bg-[color:var(--jd-nav-bg)] pl-6 pr-5 backdrop-blur-[var(--jd-glass-blur)] max-sm:hidden",
          className,
        )}
      >
        <TopBarWordmark brand={brand} wordmark={name} label={accessibleName} href={href} size={28} linkAs={LinkAs} />
        {sections && sections.length > 0 && (
          <nav aria-label={navLabel ?? name} className="flex flex-row gap-[22px] text-sm font-medium max-lg:hidden">
            {sections.map((section) => {
              const Tag = section.plain ? "a" : LinkAs;
              return (
                <Tag
                  key={section.id}
                  href={section.href}
                  aria-current={section.id === active ? "page" : undefined}
                  className="inline-flex min-h-11 flex-row items-center text-[color:var(--jd-muted)] no-underline hover:text-[color:var(--jd-ink)] hover:underline hover:underline-offset-[6px] aria-[current=page]:font-bold aria-[current=page]:text-[color:var(--jd-ink)] aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
                >
                  {section.label}
                </Tag>
              );
            })}
          </nav>
        )}
        <span className="flex-1" />
        {search}
        <span className="flex shrink-0 flex-row items-center gap-1">{actions}</span>
      </header>
      <TopBarPhone brand={brand} wordmark={name} label={accessibleName} href={href} trail={trail} actions={phoneActions} linkAs={LinkAs} />
    </>
  );
}
