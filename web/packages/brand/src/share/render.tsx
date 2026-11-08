import { ImageResponse } from "next/og";

import { toolFor } from "../tools";
import { assertBrand, tileDataUri } from "./assets";
import { ClientCard } from "./client-card";
import type { CardContext } from "./context";
import { HomeDark } from "./dark";
import { loadShareFonts } from "./fonts";
import { shareInk } from "./ink";
import { ItemCard } from "./item";
import { HomeLight } from "./home-light";
import { PrivateLight } from "./private-light";
import { kidPicture, stripPicture } from "./pictures";
import { SHARE_SIZE, SHARE_SQUARE_SIZE, type ShareCardSpec, type ShareProductSpec } from "./spec";

/*
 * renderShareCard: one function for every card (`share_card(slug, style, kind, ...)` in the
 * design). Call it from an `opengraph-image.tsx` and return its result:
 *
 *   export const { size, contentType } = shareImage;
 *   export const alt = shareAlt(spec);
 *   export default async function Image() { return renderShareCard(spec); }
 *
 * `square` draws the 1200 x 1200 cut for places that ask for a square.
 */
export interface RenderOptions {
  square?: boolean;
}

/** "cibus-iter" -> "CIBUS ITER" for a wordmark; "email-editor" -> "Email editor" for a tool. */
function defaultName(slug: string): string {
  const words = slug.replace(/-/g, " ");
  return toolFor(slug) ? words.charAt(0).toUpperCase() + words.slice(1) : words.toUpperCase();
}

async function contextOf(spec: ShareProductSpec, square: boolean): Promise<CardContext> {
  assertBrand(spec.product);
  return {
    slug: spec.product,
    name: spec.name ?? defaultName(spec.product),
    ink: spec.ink ?? shareInk(spec.product),
    tile: await tileDataUri(spec.product, 104),
    square,
  };
}

async function card(spec: ShareCardSpec, square: boolean) {
  if (spec.kind === "client") return <ClientCard spec={spec} square={square} />;
  const ctx = await contextOf(spec, square);
  switch (spec.kind) {
    case "home": {
      if (spec.style === "dark") return <HomeDark spec={spec} ctx={ctx} />;
      const pictures = {
        kid: spec.kid ? await kidPicture(spec.kid) : undefined,
        strip: spec.art === "robots-at-work" ? await stripPicture() : undefined,
      };
      return <HomeLight spec={spec} ctx={ctx} pictures={pictures} />;
    }
    case "private":
      return <PrivateLight spec={spec} ctx={ctx} kid={await kidPicture(spec.kid ?? "shh")} />;
    default:
      return <ItemCard spec={spec} ctx={ctx} kid={spec.kid ? await kidPicture(spec.kid) : undefined} />;
  }
}

export async function renderShareCard(spec: ShareCardSpec, { square = false }: RenderOptions = {}): Promise<ImageResponse> {
  const [element, fonts] = await Promise.all([card(spec, square), loadShareFonts()]);
  return new ImageResponse(element, {
    ...(square ? SHARE_SQUARE_SIZE : SHARE_SIZE),
    fonts: fonts.map(({ name, data, weight, style }) => ({ name, data, weight, style })),
  });
}
