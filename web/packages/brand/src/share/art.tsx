import type { ReactNode } from "react";

import { echoAccent } from "../echo";
import { tileDataUri } from "./assets";
import { ShareEchoBox } from "./echo-box";
import { shareInk } from "./ink";

/*
 * Two drawings every product's card can borrow while it has no art of its own, built from the
 * product's seal: the seal over its echo (an item's picture), and a row of seals (a home's "all
 * the apps"). They are async because the seal is serialized to an image first; await them and
 * pass the result as the card's `art`.
 */

/** The product's seal, large, over a copy of itself in the product's echo color. */
export async function shareSealArt(slug: string, size = 300): Promise<ReactNode> {
  const src = await tileDataUri(slug, size);
  const radius = Math.round(size * 0.24);
  return (
    <ShareEchoBox color={echoAccent(slug) ?? shareInk(slug)} width={size} height={size} radius={radius}>
      <img src={src} width={size} height={size} alt="" style={{ width: size, height: size, borderRadius: radius }} />
    </ShareEchoBox>
  );
}

/** A row of product seals, left to right, `size` px each. */
export async function shareAppIcons(slugs: readonly string[], size = 72): Promise<ReactNode> {
  const sources = await Promise.all(slugs.map((slug) => tileDataUri(slug, size)));
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", columnGap: 18 }}>
      {sources.map((src, i) => (
        <img
          key={slugs[i]}
          src={src}
          width={size}
          height={size}
          alt=""
          style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}
        />
      ))}
    </div>
  );
}
