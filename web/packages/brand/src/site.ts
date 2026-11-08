/**
 * site.ts — who publishes javadaba.com, in the vocabulary a machine reads.
 *
 * WHY IT LIVES IN `@javadaba/brand` AND NOT IN THE LANDING. The domain is served by eight
 * different containers —the landing plus each app's own Next process— and every one of them
 * emits its own `<head>`. Identity that lived in the landing would be true for the landing
 * only, which is exactly what production looked like on 2026-08-22: the site-integrity
 * watchdog found **19 indexable pages with zero structured data** —the whole `/fluxor/**`
 * documentation zone (14 pages), `/curriculum`, `/curriculum/jobs`, `/creatio`,
 * `/tributa/news` and `/fabula/stories`— because those zones are served by apps and the
 * three JSON-LD nodes only existed in `javadaba-landing/src/app/layout.tsx`.
 *
 * `@javadaba/brand` is the only package that ALL of them already depend on (derived, not
 * assumed: `python3 .harness/skills/topology/topology.py map`), so adopting this adds no
 * dependency edge to the graph.
 *
 * WHAT BELONGS HERE AND WHAT DOESN'T. The **public** identity of the site: the name, the URL,
 * the logo, the contact address, and the jurisdiction. The **legal** identity —NIF, street
 * address, jurisdiction clause, clause version— stays in
 * `javadaba-landing/src/lib/legal-identity.ts`, which is the only surface obliged to publish
 * it (LSSI-CE art. 10) and which imports the shared half from here rather than restating it.
 * One datum, one place, which is the premise that module was written on.
 *
 * The nodes are `@id`-keyed on purpose: a crawler that reads three zones of the domain gets
 * the same Organization three times and resolves them to ONE entity. That's the mechanism
 * that makes emitting site identity per zone correct rather than duplicated.
 */

/** Canonical origin. Every `@id` and every absolute URL in the graph hangs off this one. */
export const SITE_URL = "https://javadaba.com";

/** Contact address published as the service provider's (LSSI-CE art. 10.1.a). */
export const SITE_EMAIL = "support@javadaba.com";

/**
 * Javadaba isn't a company: it's operated by a sole trader. The Organization's `name` is the
 * BRAND and the person goes in `founder`, instead of declaring a legal entity that doesn't
 * exist (2026-08-04).
 */
export const SITE_FOUNDER = "Carlos Molina Galindo";

/**
 * schema.org `PostalAddress`, **deliberately without the street**. Structured data is
 * harvested by machines at scale and the checks that read it —"is this business real",
 * entity resolution— are answered by the jurisdiction; a private home's street number in a
 * machine-readable field would give them nothing they don't already have while giving a
 * scraper something it doesn't. If Javadaba ever incorporates and gets a registered office,
 * `streetAddress` belongs here.
 */
export const SITE_POSTAL = {
  addressLocality: "Murcia",
  addressRegion: "Murcia",
  postalCode: "30120",
  addressCountry: "ES",
} as const;

/**
 * The `description`, `email`, `contactPoint` and `address` are not decoration: they were added
 * on 2026-08-22 after the is-agentic scan reported the Organization node "missing key fields".
 * They are what a machine reads to answer "is this a real service and how do I reach it"
 * without parsing a legal page written in prose.
 */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Javadaba",
  description:
    "Javadaba is a free web desktop: one account, your apps running in windows in the " +
    "browser, nothing to install. It also publishes single-purpose utility APIs for " +
    "developers and an open, citable archive of daily search trends.",
  url: SITE_URL,
  logo: `${SITE_URL}/img/logos/javadaba_logo_clean.png`,
  email: SITE_EMAIL,
  founder: { "@type": "Person", name: SITE_FOUNDER },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE_EMAIL,
      url: `${SITE_URL}/contact`,
      availableLanguage: ["en", "es"],
      areaServed: "Worldwide",
    },
  ],
  address: { "@type": "PostalAddress", ...SITE_POSTAL },
} as const;

/**
 * No `potentialAction` SearchAction: the site doesn't have a real search engine yet (plan
 * 2026-07-04, wave 4.2) — it'll be added if that surface ever exists. Declaring one that
 * resolves to nothing is worse than declaring none.
 */
export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Javadaba",
  description:
    "All your apps in a free web desktop, plus utility APIs and open search-trend data.",
  url: SITE_URL,
  inLanguage: "en",
  publisher: { "@id": `${SITE_URL}/#organization` },
} as const;

/**
 * A `SoftwareApplication` node for one app of the ecosystem, so a zone says what IT is and
 * not just who publishes it.
 *
 * `offers` with price 0 is the only unambiguous way to state "free" to a machine — an
 * adjective in a hero is not machine-readable. `publisher` points at the shared Organization
 * `@id`, which is what ties the app to the site rather than leaving it a free-floating node.
 *
 * @param slug  the app's public slug; becomes the node's `@id` fragment.
 * @param name  the app's public name, the same one the catalog and the desktop use.
 * @param url   the app's canonical surface, absolute.
 */
export function appJsonLd(options: {
  slug: string;
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  /**
   * `undefined` (default) keeps every existing caller's behaviour: an `offers` node at "0" EUR,
   * i.e. "free". Pass `null` when pricing has not been decided yet (Officium, HUMAN-013) -- the
   * node is omitted entirely instead of defaulting to a claim nobody has made. An explicit price
   * string still works exactly as before.
   */
  price?: string | null;
}) {
  const offers =
    options.price === null ? undefined : { "@type": "Offer" as const, price: options.price ?? "0", priceCurrency: "EUR" };
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#app-${options.slug}`,
    name: options.name,
    description: options.description,
    url: options.url,
    applicationCategory: options.applicationCategory ?? "BusinessApplication",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript and a modern browser.",
    ...(offers ? { offers } : {}),
    publisher: { "@id": `${SITE_URL}/#organization` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  } as const;
}
