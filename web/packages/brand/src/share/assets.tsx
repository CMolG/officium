import { createElement, type ReactElement } from "react";
// `react-dom/server.edge`, not `react-dom/server`: see `../favicon.tsx`, which serializes the seal
// the same way and for the same reasons (the App Router rejects the other entry point).
import { renderToReadableStream } from "react-dom/server.edge";

import { StandaloneLogo } from "../JavadabaLogo";
import { ToolMark } from "../ToolMark";
import { ICONS } from "../icons";
import { brandEntry } from "../registry";
import { toolFor } from "../tools";

/*
 * The pictures a card needs that are not files: the product's seal and tool mark, serialized to an
 * SVG `data:` URI because Satori cannot rasterize an inline `<svg>` with filters (the seal's shadows
 * and relief) but embeds an image as it is, and a Lucide glyph, drawn inline because it has none.
 */

async function svgDataUri(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  const svg = await new Response(stream).text();
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** The product's tile as an image: its glass seal, or its tool mark when it is an API or a tiny tool. */
export function tileDataUri(slug: string, size: number): Promise<string> {
  const tool = toolFor(slug);
  // Drawn at twice its size and shown at `size`, so a 104 px tile stays sharp on a retina chat.
  return svgDataUri(
    tool ? (
      <ToolMark category={tool.category} size={size * 2} />
    ) : (
      <StandaloneLogo brand={slug} format="glass" size={size * 2} grain />
    ),
  );
}

/** A registry brand that exists, or an error naming the caller: a missing seal ships a blank tile. */
export function assertBrand(slug: string): void {
  if (!brandEntry(slug)) throw new Error(`@javadaba/brand/share: "${slug}" is not in the brand registry`);
}

/** A Lucide glyph by its registry name, drawn inline. Satori wants explicit colors, not `currentColor`. */
export function GlyphSvg({
  name,
  size,
  color,
  stroke = 2,
}: {
  name: string;
  size: number;
  color: string;
  stroke?: number;
}) {
  const node = ICONS[name];
  if (!node) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

/** The registry name of a product's glyph, for its dark card. */
export function glyphNameFor(slug: string): string | undefined {
  return brandEntry(slug)?.icon;
}
