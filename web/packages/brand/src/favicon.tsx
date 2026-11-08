import { ImageResponse } from "next/og";
// `react-dom/server.edge` and not `react-dom/server`: the App Router rejects the latter at
// build time ("You're importing a component that imports react-dom/server"), and the edge
// entry point is the same renderer without that rule. No page is being rendered here, just an
// SVG being serialized to text. And the stream API, not `renderToStaticMarkup`: under webpack
// (fluxor-web) Next aliases `server.edge` in a route handler to a stub whose legacy APIs throw
// "do not use legacy react-dom/server APIs" (JAVA-225). For the seal both give the same bytes.
import { renderToReadableStream } from "react-dom/server.edge";

import { StandaloneLogo, identityFormat } from "./JavadabaLogo";
import { ToolMark } from "./ToolMark";
import { brandEntry } from "./registry";
import { toolFor } from "./tools";

/*
 * Brand favicon: the seal of `@javadaba/brand` in the browser tab.
 *
 * <h2>Why it lives here and not in the landing</h2>
 *
 * Because it was written there and the eight miniapps could not reach it, so each of them
 * shipped a hand-made `src/app/icon.png` instead — a PNG derived from the brand at some point
 * in the past, by a process nobody recorded, with nothing to keep it in step afterwards.
 * Curriculum is the proof: its seal is gold (`#FFCD50 → #FFCEA1 → #F4F2DB`) and its tab icon
 * was BLUE, left over from a gradient that was changed and then reverted (see the note above
 * `curriculum` in `registry.ts`). Nobody noticed for months, because a PNG doesn't know it has
 * gone stale. Reported by the user on 2026-08-23.
 *
 * Derived, it cannot drift: changing the registry changes the tab on the next build.
 *
 * <h2>The `next` dependency</h2>
 *
 * `next/og` is an OPTIONAL peer. This module is a separate subpath (`@javadaba/brand/favicon`)
 * precisely so that importing the package never drags Next in: the Host, a test, a build script
 * and the tokens all go through `@javadaba/brand` and stay Next-free. Every consumer of THIS
 * file is a Next app by ADR 0001, so the peer is always satisfied where it matters.
 *
 * <h2>How it's drawn, and why this way</h2>
 *
 * `ImageResponse` (Satori) does NOT know how to rasterize an inline `<svg>` with filters: the
 * seal's shadows and the glyph's relief are `feGaussianBlur`/`feMorphology`, and passing
 * `<JavadabaLogo/>` directly as a child of `ImageResponse` blows up while rasterizing ("Input
 * buffer has corrupt header: XML parse error", measured on 2026-08-08). What does work is
 * serializing the brand SVG and handing it over as an IMAGE: Satori embeds it as-is and the
 * rasterizer (librsvg, via sharp) does implement the filters. Hence the serialized SVG
 * (`renderToReadableStream`) + data-URI.
 *
 * <h2>Format, and grain</h2>
 *
 * The format is decided by `identityFormat(brand)`, not here: the glass seal for every product,
 * `rethink` for an API, the diamond (`spinner`) only for the ecosystem's base brand. Grain is off
 * whatever the format (user decision, 2026-08-13): it is surface texture, and at 16px it doesn't
 * read as such — it only muddies the gradient and triples the PNG's weight. That is an exception
 * for the TAB ICON; wherever the seal shows up large the grain stays.
 *
 * An API or a Tiny Tool (SEO Brain, the email editor) has no seal in the tab: it wears its tool mark,
 * the disc of its category (Library 19), serialized the same way. `TOOLS` in `tools.ts` decides.
 *
 * Social covers (`opengraph-image.tsx`) have their own system and are not touched from here.
 * The `apple-touch-icon` is the same seal at another size (`renderAppleTouchIcon`, JAVA-225).
 */

/**
 * PNG side length. 64, not Next's conventional 32: the seal has a thin stroke and an inner
 * glyph, and on @2x screens a 32 PNG looks mushy. It weighs ~1 KB and the browser downscales it
 * to 16/32 with no help needed.
 */
export const faviconSize = { width: 64, height: 64 };

export const faviconContentType = "image/png";

/**
 * Only for the bare diamond: its canvas (850 units) leaves air around it, which at 16px is half
 * a wasted icon. It's drawn 35% bigger than the frame and gets cropped: the diamond reaches
 * almost to the edge and still doesn't get cut off at the points.
 *
 * The squares (`glass`, `rethink`) do NOT carry it (stay at 1): there the drawing IS already the whole square,
 * and enlarging it would only crop its rounded corners and the glyph.
 */
const ZOOM = 1.35;

/**
 * The icon iOS puts on the home screen. Safari ignores the web manifest's icons and reads only
 * `<link rel="apple-touch-icon">`, which must be a PNG; 180 is the iPhone's @3x size, and iOS
 * scales it for everything else. Only Sonus had one, hand-made (JAVA-225).
 *
 * iOS applies its own rounded mask, wider than the seal's corners, so the square seal is drawn
 * full-bleed. Grain stays on: it is only off where the seal is too small to read it as texture.
 * Every app serves it from `apple-touch-icon.png/route.tsx`, never from the `apple-icon.tsx` file
 * convention, for the same basePath reason as the tab icon
 * (`scripts/test/basepath-generated-icons.test.mjs`).
 */
export const appleTouchIconSize = { width: 180, height: 180 };

/** Seal of a registry brand as a tab PNG. */
export function renderFavicon(brand: string): Promise<ImageResponse> {
  return renderSeal("renderFavicon", brand, faviconSize, false);
}

/** Seal of a registry brand as the iOS home-screen PNG. */
export function renderAppleTouchIcon(brand: string): Promise<ImageResponse> {
  return renderSeal("renderAppleTouchIcon", brand, appleTouchIconSize, true);
}

/** Seal of a registry brand as an installable app's icon (the web manifest's 192 and 512 PNGs), full-bleed like the iOS one. */
export function renderAppIcon(brand: string, side: number): Promise<ImageResponse> {
  return renderSeal("renderAppIcon", brand, { width: side, height: side }, true);
}

async function renderSeal(
  caller: string,
  brand: string,
  { width, height }: { width: number; height: number },
  grain: boolean,
): Promise<ImageResponse> {
  if (!brandEntry(brand)) {
    // Without this, `JavadabaLogo` returns null and the build would publish a transparent PNG
    // with nobody noticing until they see it in the tab.
    throw new Error(`${caller}("${brand}"): that brand doesn't exist in @javadaba/brand`);
  }

  const format = identityFormat(brand);
  const tool = toolFor(brand);
  const stream = await renderToReadableStream(
    // One seal per document, and no hook may run here: see `StandaloneLogo`.
    tool ? (
      <ToolMark category={tool.category} size={width} />
    ) : (
      <StandaloneLogo brand={brand} format={format} size={width} grain={grain} />
    ),
  );
  await stream.allReady;
  const svg = await new Response(stream).text();
  const source = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const drawn = Math.round(width * (format === "spinner" && !tool ? ZOOM : 1));
  const offset = Math.round((width - drawn) / 2);

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      <img
        src={source}
        alt=""
        width={drawn}
        height={drawn}
        style={{ marginLeft: offset, marginTop: offset }}
      />
    </div>,
    { width, height },
  );
}
