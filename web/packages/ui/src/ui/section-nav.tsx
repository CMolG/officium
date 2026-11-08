import type { ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import type { ProductNavLink } from "./javadaba-links";
import { Text } from "./text";

/** A section in the bar's second level. `id` is what `active` is matched against. */
export interface ProductNavSection extends ProductNavLink {
  id: string;
  /** Optional leading glyph, drawn in a 32 px tile (ink on the current section). */
  icon?: ReactNode;
  /** A second line under the label (`7/12`, `1 to fix`), in the body face. */
  state?: string;
  /** Replaces `state` below 640 px. 8 characters at most; it is never cut in code. */
  stateShort?: string;
  /** A thin rule after this section, in the inline layout: the directory stands apart from the app (Cur-Front). */
  separatorAfter?: boolean;
  /** The reason this section cannot open yet: a non-link whose state line is this; `stateShort` still applies below 640 px. */
  disabled?: string;
}

/*
 * SectionNav — route tabs: `ProductNavBar`'s sections bar as a piece of its own.
 *
 * A stage that is a ROUTE (Theatrum's Story · Plan · Shoot · Cut) cannot be Radix `tabs`, which
 * switch in-page panels. This is the navigation the product bar already drew, plus what a stage
 * needs: a state line under the label (`7/12`, `1 to fix`) and a disabled tab that stays visible
 * with its reason. No hooks and no state, so it renders on SSR pages before hydration.
 *
 * `nav` + links, not `role=tablist`: each tab opens a route. The current tab is marked three ways
 * (weight, ink, rule); colour is never the only channel (`rules/interface-psychology.md` §4).
 */

export interface SectionNavProps {
  sections: readonly ProductNavSection[];
  /** The `id` of the current section. */
  active?: string;
  /** The app's own `<Link>`; a section with `plain` is always an `<a>`. */
  linkAs?: ElementType;
  /** The nav's accessible name. */
  label?: string;
  /**
   * Few short tabs that share the width below 640 px instead of scrolling sideways. Without it
   * the bar is today's: it overflows by design, with the scrollbar hidden.
   */
  fitWidth?: boolean;
  className?: string;
}

/** The shared ring, drawn inside the tab (a tab strip clips what is outside it). */
const FOCUS = FOCUS_RING + " focus-visible:-outline-offset-2";

/** A state line in `--jd-faint`; `weight` stops the current tab's semibold leaking in. */
function stateLine(text: string, className?: string) {
  return (
    <Text size="xs" tone="faint" weight="regular" className={className}>
      {text}
    </Text>
  );
}

/** One or two lines: a distinct `stateShort` replaces the long one below 640 px. */
function stateLines(long?: string, short?: string) {
  if (!long) return null;
  if (!short || short === long) return stateLine(long);
  return (
    <>
      {stateLine(long, "max-sm:hidden")}
      {stateLine(short, "sm:hidden")}
    </>
  );
}

function tabBody(section: ProductNavSection, current: boolean) {
  const reason = section.disabled;
  const long = reason ?? section.state;
  const text = (
    <span className="flex flex-col">
      <Text>{section.label}</Text>
      {stateLines(long, section.stateShort)}
    </span>
  );
  return (
    <>
      {section.icon ? (
        <span className="flex flex-row items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              "flex size-8 shrink-0 flex-row items-center justify-center rounded-[9px]",
              current ? "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]" : "bg-[color:var(--jd-card)]",
            )}
          >
            {section.icon}
          </span>
          {text}
        </span>
      ) : (
        text
      )}
      {current && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-[color:var(--jd-ink)]" />
      )}
    </>
  );
}

export function SectionNav({
  sections,
  active,
  linkAs: LinkAs = "a",
  label = "Sections",
  fitWidth,
  className,
}: SectionNavProps) {
  if (sections.length === 0) return null;
  return (
    <nav
      aria-label={label}
      className={cn(
        "flex flex-row h-14 w-full min-w-0 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        fitWidth ? "gap-2 sm:gap-8" : "gap-6 sm:gap-8",
        className,
      )}
    >
      {sections.map((section) => {
        const disabled = section.disabled !== undefined;
        const current = !disabled && section.id === active;
        const tabClass = cn(
          "relative flex flex-col justify-center whitespace-nowrap px-1 text-sm transition-colors duration-[var(--jd-dur-fast)]",
          fitWidth ? "min-w-11 flex-1 sm:flex-none" : "shrink-0",
          FOCUS,
          disabled
            ? "font-medium text-[color:var(--jd-faint)]"
            : current
              ? "font-semibold text-[color:var(--jd-ink)]"
              : "font-medium text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)]",
        );
        const body = tabBody(section, current);
        const long = section.disabled ?? section.state;
        const name =
          long && section.stateShort && section.stateShort !== long
            ? `${section.label} ${long}`
            : undefined;
        if (disabled) {
          return (
            <span key={section.id} role="link" aria-disabled="true" aria-label={name} className={tabClass}>
              {body}
            </span>
          );
        }
        const Tag: ElementType = section.plain ? "a" : LinkAs;
        return (
          <Tag
            key={section.id}
            href={section.href}
            aria-current={current ? "page" : undefined}
            aria-label={name}
            className={tabClass}
          >
            {body}
          </Tag>
        );
      })}
    </nav>
  );
}
