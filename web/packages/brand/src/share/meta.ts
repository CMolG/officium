import type { Metadata } from "next";

import { SHARE_CONTENT_TYPE, SHARE_SIZE } from "./spec";

/*
 * What the page carries for its card (Library 18, "Tags"): the og: and twitter: tags. The card
 * itself is the colocated `opengraph-image` file, which Next turns into og:image, its width and
 * height, and twitter:image; `shareImage` is what that file exports, and its `alt` (from
 * `shareAlt(spec)`) becomes og:image:alt and twitter:image:alt, so the card is always described.
 *
 * Made when the page is published, in the page's language: og:locale and every word on the card
 * follow the page (Tributa in Spanish, the rest in English).
 *
 * TODO(backend): the design stores each card at `/og/{path}.png`, rendered on the server when the
 * page is published and versioned when it changes so caches refresh. No endpoint stores or versions
 * images yet, so every page serves its card from its own `opengraph-image` route, which Next
 * prerenders and revalidates with the page.
 */

/** Export these from `opengraph-image.tsx`: `export const { size, contentType } = shareImage;`. */
export const shareImage = { size: SHARE_SIZE, contentType: SHARE_CONTENT_TYPE } as const;

export interface ShareMetadataInput {
  /** The page's own title and first line; the card does not repeat them word for word. */
  title: string;
  description: string;
  /** The page's canonical address, absolute. */
  url: string;
  /** `en_US` for every product except Tributa's `es_ES`. */
  locale?: "en_US" | "es_ES";
  /** `article` for a dish, a post or a guide; `website` for a home. */
  type?: "website" | "article";
}

export function shareMetadata({ title, description, url, locale = "en_US", type = "website" }: ShareMetadataInput): Metadata {
  return {
    title,
    description,
    openGraph: { type, siteName: "Javadaba", title, description, url, locale },
    twitter: { card: "summary_large_image", title, description },
  };
}
