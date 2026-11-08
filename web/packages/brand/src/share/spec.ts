import type { ReactNode } from "react";
import type { DoodleName } from "../doodles/catalog";

/*
 * The share card's contract (Library 18). The image a link shows when someone pastes it:
 * 1200 x 630 for og:image and twitter:image, plus an optional 1200 x 1200 cut. A card is data:
 * a product, a kind of page, the page's own words. Every product composes its cards with it.
 */

export const SHARE_SIZE = { width: 1200, height: 630 } as const;
export const SHARE_SQUARE_SIZE = { width: 1200, height: 1200 } as const;
export const SHARE_CONTENT_TYPE = "image/png";
/** Nothing important closer to the edge than this. */
export const SHARE_PADDING = 56;

/** Light is the default; dark is for dark places and only draws a home card. */
export type ShareStyle = "light" | "dark";

/** What every card says about whose it is. */
export interface ShareProductSpec {
  /** A registry slug: `officium`, `cibus-iter`, `email-editor`. Draws the tile, the colors and the mark. */
  product: string;
  /** How the product writes its name. Defaults to the slug in capitals ("CIBUS ITER"). */
  name?: string;
  /** The wordmark dot and the accent phrase, at 4.5:1 on the card. Defaults to the product's `shareInk`. */
  ink?: string;
}

/**
 * Drawings the card places itself: the kid (a doodle of `@javadaba/brand/doodles`) and what the
 * product draws. `art` is JSX that Satori can render (flex, absolute, gradients, inline svg, `img`
 * with a data URI): build it with the parts exported from `@javadaba/brand/share`.
 */
export interface ShareHomeCard extends ShareProductSpec {
  kind: "home";
  style?: ShareStyle;
  /** One headline, about 60 characters at most, the page's own words. */
  headline: string;
  /** Optional, short, last: the POC's "Vacation mode: ON." */
  accent?: string;
  /** The kid, bottom left of the art zone. */
  kid?: DoodleName;
  /** The product's drawing, bottom right of the art zone (520 px wide). `"robots-at-work"` is the strip. */
  art?: ReactNode | "robots-at-work";
}

/** A dish, a color, a book, a station, a job, a ticker, a post, a form, a component; or a blog post. */
export interface ShareItemCard extends ShareProductSpec {
  kind: "item" | "article";
  /** Product and where it was published: "Cibus Iter · Spain". */
  kicker: string;
  headline: string;
  /** One line: "Iberian ham · #TOP 1 in Spain". */
  subline?: string;
  /** The page's address, without the scheme: `javadaba.com/cibus-iter/spain/jamon-iberico`. */
  domain: string;
  /** The item's own picture on the right (480 px wide), or a doodle. */
  art?: ReactNode;
  kid?: DoodleName;
}

/** Something not public: what it is and who can open it, never its contents. */
export interface SharePrivateCard extends ShareProductSpec {
  kind: "private";
  headline: string;
  subline: string;
  /** Defaults to the one who keeps a secret. */
  kid?: DoodleName;
}

/** A client's site or form: the client's name and colors, no Javadaba mark. */
export interface ShareClientCard {
  kind: "client";
  client: { name: string; initial?: string; ink: string; background: string; accent: string };
  kicker: string;
  headline: string;
  subline?: string;
  /** The client's own domain. */
  domain: string;
  art?: ReactNode;
}

export type ShareCardSpec = ShareHomeCard | ShareItemCard | SharePrivateCard | ShareClientCard;

/** The text a card carries for og:image:alt and twitter:image:alt: what the card says. */
export function shareAlt(spec: ShareCardSpec): string {
  if (spec.kind === "client") return `${spec.client.name}: ${spec.headline}`;
  const name = spec.name ?? spec.product.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const phrase = spec.kind === "home" && spec.accent ? ` ${spec.accent}` : "";
  const line = spec.kind === "item" || spec.kind === "article" ? (spec.subline ? `, ${spec.subline}` : "") : "";
  return `${name}: ${spec.headline}${phrase}${line}`;
}
