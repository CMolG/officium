import type { ReactElement } from "react";

import { organizationJsonLd, websiteJsonLd } from "./site";

/**
 * The site's identity as JSON-LD, for a zone's root layout.
 *
 * Drop it inside `<body>` of any zone of javadaba.com —the landing or any app's own Next
 * process— and that zone stops being anonymous to a crawler. The nodes are `@id`-keyed, so a
 * machine reading several zones resolves them to one entity instead of three; see
 * `site.ts` for why that makes per-zone emission correct rather than duplicated.
 *
 * `extra` is where a zone says what IT is on top of who publishes it — typically one
 * {@link import("./site").appJsonLd} node. Serialized one `<script>` per node and not as a
 * single `@graph`: the watchdog and every validator count scripts, and one malformed node in
 * a graph invalidates the rest of it.
 */
export function SiteJsonLd({ extra = [] }: { extra?: readonly unknown[] }): ReactElement {
  return (
    <>
      {[organizationJsonLd, websiteJsonLd, ...extra].map((node, index) => (
        <script
          // The list is static per render and its entries carry no id of their own; the index
          // IS the identity here.
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
    </>
  );
}
