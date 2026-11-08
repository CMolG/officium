/** One level of a trail. The last level is the current page and has no `href`. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * The same trail as structured data (schema.org `BreadcrumbList`), for the `<script type="application/ld+json">`
 * a content page carries (Lib-Pieces § Breadcrumb). `origin` makes the relative `href`s absolute; the current
 * page has no `item`, as Google's guidance has it.
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[], origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: /^https?:\/\//.test(item.href) ? item.href : `${origin}${item.href}` } : {}),
    })),
  };
}
