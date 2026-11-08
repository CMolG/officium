import { JavadabaLogo, ToolMark, toolFor } from "@javadaba/brand";

/*
 * ProductSeal -- the small mark of a product or a tool, wherever the chrome names one: the tour's
 * card, the menu's launcher, a footer. A tool (an API, an email editor) is drawn as its category's
 * mark; a product as its glass seal. One place decides which, so a caller passes only the slug.
 */

export interface ProductSealProps {
  /** Brand registry slug (`fabula`) or tool slug (`qr-code`). */
  brand: string;
  /** Side in px. */
  size?: number;
  /** Accessible name. Omitted, the seal is decorative: the product's name sits beside it. */
  title?: string;
  className?: string;
}

export function ProductSeal({ brand, size = 24, title, className }: ProductSealProps) {
  if (toolFor(brand)) return <ToolMark slug={brand} size={size} className={className} />;
  return (
    <span aria-hidden={title ? undefined : true} className="flex flex-row shrink-0">
      <JavadabaLogo brand={brand} size={size} title={title} className={className} />
    </span>
  );
}
