import type { ElementType, ReactNode } from "react";
import { JavadabaLockup, JavadabaMark } from "@javadaba/brand";

import { cn } from "../lib/cn";
import { AnimationsSwitch } from "../motion/animations-switch";
import { FooterColumn } from "./footer-column";
import { JAVADABA_LINKS, type ProductNavLink } from "./javadaba-links";
import { ProductSeal } from "./product-seal";
import { JAVADABA_SOCIAL, SocialGlyph, socialLabel, type ProductSocialLink } from "./social-glyph";
import { Text } from "./text";

/*
 * ProductFooter -- every product signs as Javadaba (Lib-Chrome 07). The product's own links, its
 * legal links and the consent control, the house it belongs to, and the mark. Optional: a social row,
 * a disclaimer band for regulated products, and a handwritten note.
 *
 * "Part of Javadaba" is the signature, so the period that closes a product's wordmark is not drawn
 * down here: the company is signing. The consent control sits with the legal links and is a button,
 * never a link to a page: withdrawing consent costs what granting it did (`interface-psychology.md`).
 *
 * `mt-auto` is half of what this piece is for: on a page with little content (an empty listing, a
 * 404) a footer that is not pushed down floats in the middle of the screen and reads as the end of a
 * broken page. It needs a `flex flex-col min-h-dvh` shell.
 */

export interface ProductFooterProps {
  /** The product's slug. Given, the footer's first block is that product (seal, wordmark, line); omitted, it is Javadaba's lockup. */
  brand?: string;
  /** Wordmark text. Defaults to the slug in caps. */
  wordmark?: string;
  /** One line on what the product is. */
  tagline?: string;
  /** The product's own column: its name over its links ("Tributa": Facturas, Clientes, Ayuda). */
  nav?: { title: string; links: readonly ProductNavLink[] };
  /** The PRODUCT's legal links: terms, privacy. Drawn in a "Legal" column. */
  legal?: readonly ProductNavLink[];
  /** The legal column's title. Defaults to "Legal". */
  legalTitle?: string;
  /**
   * The control that reopens the analytics consent choice (`<ConsentLink/>` from `@javadaba/analytics`),
   * passed in by the app: the base package cannot depend on its consumer (`topology.py verify`).
   * Forgetting it is caught by `scripts/test/analytics-surfaces.test.mjs`.
   */
  consent?: ReactNode;
  /** The Javadaba column. Defaults to `JAVADABA_LINKS`. */
  links?: readonly ProductNavLink[];
  /** The Javadaba column's title. Defaults to "Javadaba". */
  linksTitle?: string;
  /** The social row. Defaults to `JAVADABA_SOCIAL`; `false` removes it. */
  social?: readonly ProductSocialLink[] | false;
  /** A regulated product's disclaimer, in its own band, in the body face: it is text that has to be readable. */
  disclaimer?: ReactNode;
  /** A short handwritten note, one line, never a paragraph. */
  note?: string;
  /**
   * Who signs the copyright line. Defaults to the name on the sheet, "Javadaba" (Lib-Footer, wave 7,
   * MIG-A11): the legal identity of whoever holds the rights lives in the legal texts, not in the footer
   * (`javadaba-landing/src/lib/legal-identity.ts` is the record).
   */
  holder?: string;
  /** Year of the notice. Defaults to the current one so the footer cannot go stale. */
  year?: number;
  /** BCP 47 tag of the product's own columns and disclaimer when it is not English ("es"). */
  lang?: string;
  linkAs?: ElementType;
  className?: string;
}

const BAND = "mx-auto w-full max-w-7xl px-4 sm:px-6";

export function ProductFooter({
  brand,
  wordmark,
  tagline,
  nav,
  legal,
  legalTitle = "Legal",
  consent,
  links = JAVADABA_LINKS,
  linksTitle = "Javadaba",
  social = JAVADABA_SOCIAL,
  disclaimer,
  note,
  holder = "Javadaba",
  year,
  lang,
  linkAs: LinkAs = "a",
  className,
}: ProductFooterProps) {
  const signedYear = year ?? new Date().getFullYear();
  const socials = social && social.length > 0 ? social : null;
  const hasLegal = Boolean(legal && legal.length > 0) || Boolean(consent);

  return (
    <footer className={cn("mt-auto border-t border-[color:var(--jd-line)] bg-[color:var(--jd-page)]", className)}>
      <div className={cn(BAND, "flex flex-col gap-10 py-12 md:flex-row md:justify-between md:py-16")}>
        <div className="flex max-w-xs flex-col gap-3" lang={lang}>
          {brand ? (
            // A plain `<a>`: from an app with `basePath` it is the only way to reach the app's own root.
            <a href="/" className="flex flex-row items-center gap-2.5">
              <ProductSeal brand={brand} size={28} />
              <span className="font-[family-name:var(--font-jd-display)] text-[22px] font-extrabold uppercase leading-none tracking-[0.04em] text-[color:var(--jd-ink)]">
                <Text>{wordmark ?? brand.toUpperCase()}</Text>
                <span className="text-[color:var(--jd-accent-mark)]">.</span>
              </span>
            </a>
          ) : (
            <JavadabaLockup href="/" size={22} variant="reveal" />
          )}
          {tagline && <p className="m-0 text-sm leading-relaxed text-[color:var(--jd-muted)]">{tagline}</p>}
          {note && (
            <p aria-hidden className="m-0 mt-2 -rotate-2 font-[family-name:var(--font-jd-hand)] text-3xl leading-none text-[color:var(--jd-muted)]">
              {note}
            </p>
          )}
        </div>

        <div className="flex flex-row flex-wrap gap-x-12 gap-y-8">
          {nav && nav.links.length > 0 && (
            <FooterColumn title={nav.title} links={nav.links} linkAs={LinkAs} lang={lang} />
          )}
          {hasLegal && (
            <FooterColumn title={legalTitle} links={legal ?? []} linkAs={LinkAs} lang={lang} after={consent} />
          )}
          <FooterColumn title={linksTitle} links={links} linkAs={LinkAs} />
        </div>
      </div>

      {/* The disclaimer is prose: it gets a band of its own instead of sharing a row with 44 px targets. */}
      {disclaimer && (
        <div className="border-t border-[color:var(--jd-line)]" lang={lang}>
          <p className={cn(BAND, "m-0 py-6 text-sm leading-relaxed text-[color:var(--jd-muted)]")}>{disclaimer}</p>
        </div>
      )}

      <div className="border-t border-[color:var(--jd-line)]">
        <div
          className={cn(BAND, "flex flex-col-reverse items-center gap-4 py-4 md:flex-row md:justify-between")}
        >
          <a href="/" className="flex min-h-11 flex-row items-center gap-3 text-sm font-medium text-[color:var(--jd-ink)]">
            <JavadabaMark variant="spread" size={56} decorative />
            <Text>Part of Javadaba</Text>
          </a>
          {socials && (
            <ul className="flex flex-row items-center gap-1">
              {socials.map((item) => {
                const external = !item.href.startsWith("mailto:");
                return (
                  <li key={item.network}>
                    <a
                      href={item.href}
                      aria-label={item.label ?? socialLabel(item.network)}
                      className="flex size-11 flex-row items-center justify-center rounded-[var(--radius-jd-pill)] text-[color:var(--jd-muted)] transition-colors duration-[var(--jd-dur-fast)] hover:bg-[color:var(--jd-hover)] hover:text-[color:var(--jd-ink)]"
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      <SocialGlyph network={item.network} />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-col items-center gap-1 md:flex-row md:gap-6">
            <AnimationsSwitch layout="inline" />
            <span className="text-xs text-[color:var(--jd-faint)]">{`© ${signedYear} ${holder}`}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
