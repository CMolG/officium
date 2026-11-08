import type { ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Badge } from "./badge";
import { Button } from "./button";
import { JAVADABA_APPS, JAVADABA_MENU_LINKS, linkTag, type ProductAppLink, type ProductNavLink } from "./javadaba-links";
import { JavadabaMenu } from "./javadaba-menu";
import { ProductSectionsInline } from "./product-sections-inline";
import { ProductSectionsSheet } from "./product-sections-sheet";
import { ProductSeal } from "./product-seal";
import { SectionNav, type ProductNavSection } from "./section-nav";
import { Text } from "./text";

/*
 * ProductNavBar -- the bar every app opened as a page wears (Lib-Chrome 07): name, place, next step.
 * It is for PRODUCTS; the company's own pages keep their header (`javadaba-landing`'s `Nav`).
 *
 * Top row: the product's seal and wordmark with its colored period, an optional stage tag ("Beta"),
 * a slot for search or a status, the one call to action, and the Javadaba diamond. Below it the
 * sections, each with a state line (`SectionNav`), and an optional third level (`SubNav`). Sticky,
 * in the bar material. The row never grows past 68 px.
 *
 * It knows no router (`linkAs` is the app's own `<Link>`; a link that crosses zones is `plain`) and
 * holds no client state, so it renders on indexable SSR pages before hydration: the Javadaba menu is
 * a `<details>`, and "who is signed in" is a slot the caller fills.
 */

export interface ProductNavBarProps {
  /** Brand slug in `@javadaba/brand`'s registry (`curriculum`, `sonus`, ...). */
  brand: string;
  /** Wordmark text. Defaults to the slug in caps, which is right for every product today. */
  wordmark?: string;
  /** Where the wordmark goes. The app's own root. */
  href?: string;
  /**
   * The product seal beside the wordmark. On by default; off for an app whose wordmark is already
   * drawn. The Javadaba diamond on the right is always there.
   */
  mark?: boolean;
  /** A stage tag beside the wordmark: "Beta". */
  stage?: string;
  /** After the wordmark, behind a slash, on a wide bar: the thing you are in ("The house of small rooms"). */
  crumb?: ReactNode;
  /** The session's header at the top of the Javadaba menu (`AccountMenuRow` from `@javadaba/account`). */
  accountSlot?: ReactNode;
  /** The session's actions at the bottom of the menu: Settings and Sign out (`AccountMenuActions`). */
  accountActionsSlot?: ReactNode;
  /** The primary action. What the product SELLS, not "open the app". */
  cta?: ProductNavLink;
  /**
   * A ready-made primary action, replacing `cta`, for one that has to DECIDE before it navigates
   * (a client state this bar does not hold).
   */
  ctaSlot?: ReactNode;
  /**
   * Whether the action stays in the bar on a phone. A tool whose page carries the action under its
   * title passes `false` (the design moves it into the page there); a marketing page keeps it.
   */
  ctaOnPhone?: boolean;
  /** The app's sections. Omitted or empty: the second level is not painted. */
  sections?: readonly ProductNavSection[];
  /**
   * Where the sections go. `below` (default) is the second row with a state line each (`SectionNav`).
   * `inline` puts them in the bar's own row as plain links (Cur-Front), from `lg` up; on a smaller
   * screen one icon button, named `sectionsLabel`, opens them as a bottom sheet.
   */
  sectionsLayout?: "below" | "inline";
  /** The inline sections' name, and the phone button's: "Curriculum sections". */
  sectionsLabel?: string;
  /**
   * A plain "Sign in" link before the action, for a visitor on a page that sells the product
   * (Thr-Stories, Cur-Front). Not shown on a phone: the Javadaba menu carries the sign-in there.
   */
  signIn?: ProductNavLink;
  /** `id` of the current section. */
  active?: string;
  /** The launcher in the Javadaba menu. Defaults to `JAVADABA_APPS`; `false` hides it. */
  apps?: readonly ProductAppLink[] | false;
  /** The heading over the launcher: "Your apps" signed in, "Apps in the house" signed out. */
  appsLabel?: string;
  /** The rest of the house in the menu. `false` hides them; with `apps` too, no diamond. */
  ecosystem?: readonly ProductNavLink[] | false;
  /** A third level (`SubNav`), painted under the sections. */
  subnav?: ReactNode;
  /** Extra controls in the top row: a search entry (`BarSearch`), a status. */
  children?: ReactNode;
  /** `contained` centers the bar in `max-w-7xl`; `full` runs it edge to edge, for a tool that fills the window. */
  width?: "contained" | "full";
  /** The app's `<Link>`. Defaults to `<a>`. */
  linkAs?: ElementType;
  className?: string;
}

export function ProductNavBar({
  brand,
  wordmark,
  href = "/",
  mark = true,
  stage,
  crumb,
  accountSlot,
  accountActionsSlot,
  cta,
  ctaSlot,
  ctaOnPhone = true,
  sections,
  sectionsLayout = "below",
  sectionsLabel,
  signIn,
  active,
  apps = JAVADABA_APPS,
  appsLabel,
  ecosystem = JAVADABA_MENU_LINKS,
  subnav,
  children,
  linkAs: LinkAs = "a",
  width = "contained",
  className,
}: ProductNavBarProps) {
  const contained = width === "contained" ? "mx-auto max-w-7xl" : "";
  const CtaTag = cta ? linkTag(cta, LinkAs) : null;
  const phoneHidden = ctaOnPhone ? "" : "max-sm:hidden";
  const name = wordmark ?? brand.toUpperCase();
  const SignInTag = signIn ? linkTag(signIn, LinkAs) : null;
  const inline = sectionsLayout === "inline" && sections && sections.length > 0 ? sections : null;
  const sectionsName = sectionsLabel ?? "Sections";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-[color:var(--jd-line)]",
        "bg-[color:var(--jd-nav-bg)] backdrop-blur-[var(--jd-glass-blur)]",
        className,
      )}
    >
      {/* The brand may SHRINK (min-w-0 + truncate) and the actions may not: on a narrow phone the
          wordmark giving up letters keeps both controls reachable. */}
      <div className={cn("flex h-16 flex-row items-center gap-3 px-4 sm:px-6 md:gap-4", contained)}>
        <div className="flex min-w-0 flex-row items-center gap-3">
          <LinkAs href={href} className="flex min-w-0 flex-row items-center gap-2.5">
            {mark && <ProductSeal brand={brand} size={28} />}
            <span className="truncate font-[family-name:var(--font-jd-display)] text-[22px] font-extrabold uppercase leading-none tracking-[0.04em] text-[color:var(--jd-ink)]">
              <Text>{name}</Text>
              {/* The period is the product's signature, in the accent made visible: a logotype is
                  governed by 3:1, not by the text contrast rule. */}
              <span className="text-[color:var(--jd-accent-mark)]">.</span>
            </span>
          </LinkAs>
          {stage && (
            <Badge register="tag" size="xs" className="max-sm:hidden">
              {stage}
            </Badge>
          )}
          {crumb && (
            <span className="flex min-w-0 flex-row items-center gap-3 max-md:hidden">
              <span aria-hidden className="text-[color:var(--jd-faint)]">
                /
              </span>
              <span className="truncate text-sm text-[color:var(--jd-muted)]">{crumb}</span>
            </span>
          )}
        </div>

        {inline && (
          <ProductSectionsInline sections={inline} active={active} linkAs={LinkAs} label={sectionsName} className="ml-4 max-lg:hidden" />
        )}

        <div className="ml-auto flex shrink-0 flex-row items-center gap-2 md:gap-3">
          {children}
          {signIn && SignInTag && (
            <SignInTag
              href={signIn.href}
              className="rounded-sm text-sm font-medium text-[color:var(--jd-muted)] no-underline hover:text-[color:var(--jd-ink)] hover:underline hover:underline-offset-[6px] max-sm:hidden"
            >
              {signIn.label}
            </SignInTag>
          )}
          {ctaSlot ? (
            <span className={cn("flex flex-row", phoneHidden)}>{ctaSlot}</span>
          ) : (
            cta &&
            CtaTag && (
              <Button asChild register="cta" variant="solid" size="sm" className={cn("px-5", phoneHidden)}>
                <CtaTag href={cta.href}>{cta.label}</CtaTag>
              </Button>
            )
          )}
          {inline && (
            <span className="flex flex-row lg:hidden">
              <ProductSectionsSheet sections={inline} active={active} linkAs={LinkAs} label={sectionsName} />
            </span>
          )}
          {/* The way back to the house, the launcher and the account, behind ONE control. */}
          <JavadabaMenu
            current={brand}
            accountSlot={accountSlot}
            accountActionsSlot={accountActionsSlot}
            apps={apps}
            appsLabel={appsLabel}
            ecosystem={ecosystem}
            linkAs={LinkAs}
          />
        </div>
      </div>

      {!inline && sections && sections.length > 0 && (
        <SectionNav sections={sections} active={active} linkAs={LinkAs} className={cn("px-4 sm:px-6", contained)} />
      )}

      {subnav && <div className={cn("flex flex-row items-center px-4 pb-2 sm:px-6", contained)}>{subnav}</div>}
    </header>
  );
}
