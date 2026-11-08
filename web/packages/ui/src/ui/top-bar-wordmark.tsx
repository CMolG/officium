import type { ElementType } from "react";

import { cn } from "../lib/cn";
import { ProductSeal } from "./product-seal";

/*
 * The seal and the wordmark of a product's top bar, with its period in the accent made visible: the
 * link home, 44 px tall. Internal to `ProductTopBar`; it knows no router (`linkAs` is the app's `<Link>`).
 */
export function TopBarWordmark({
  brand,
  wordmark,
  label,
  href,
  size,
  linkAs: LinkAs = "a",
}: {
  brand: string;
  wordmark: string;
  /** The link's accessible name ("Oleum, colors"): the wordmark text is hidden from assistive tech. */
  label: string;
  href: string;
  size: 24 | 28;
  linkAs?: ElementType;
}) {
  return (
    <LinkAs href={href} aria-label={label} className="flex min-h-11 min-w-0 flex-row items-center gap-2.5 no-underline hover:opacity-75">
      <ProductSeal brand={brand} size={size} />
      <span
        aria-hidden="true"
        className={cn(
          "truncate font-[family-name:var(--font-jd-display)] font-extrabold uppercase leading-none tracking-[0.04em] text-[color:var(--jd-ink)]",
          size === 28 ? "text-[17px]" : "text-[15px]",
        )}
      >
        {wordmark}
        <span className="text-[color:var(--jd-accent-mark)]">.</span>
      </span>
    </LinkAs>
  );
}
