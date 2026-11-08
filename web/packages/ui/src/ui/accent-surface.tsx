import type { CSSProperties, ReactNode } from "react";
import { accentGradient, brandEntry, type BrandAccent } from "@javadaba/brand";

import { cn } from "../lib/cn";

/*
 * AccentSurface — Javadaba's brand MATERIAL.
 *
 * Promoted from the landing, where it was locked in: Sonus reimplemented the same
 * recipe by hand (`.dawn-gradient`, `background-image` layers) because it couldn't
 * import it.
 *
 * The recipe, which is the source of truth for `doc://contracts/app-widget`
 * § Accent surface, is four layers ALWAYS in this order:
 *
 *   1. **App gradient at −42.58°** (the Figma angle).
 *   2. **App duotone grain** — two 25%-opacity noise layers with desynced seeds.
 *      This is what keeps the gradient from looking plastic-y.
 *   3. **Inner bottom bevel**, which gives it the edge.
 *   4. **Optional `backdrop-filter`**, when there's something behind worth blurring.
 *
 * Three details that Figma's codegen does NOT return, because it flattens what it
 * can't express, and that have to be set by hand — they're written here so nobody
 * loses them again:
 *
 *   - **The piece's border is a gradient** and it runs in the OPPOSITE direction from
 *     the fill (135° vs. −42.58°). If they ran the same way, border and fill would
 *     blend into the same tone at every corner and the border would disappear.
 *   - **The fill carries grain.**
 *   - **The piece sits on top of a light base.** That's why it comes out pale and
 *     translucent in the design; without it, the same gradient over a black page comes
 *     out saturated and eats the contrast with the border.
 *
 * ## `alpha` is not aesthetic
 *
 * Against a light surface it sits at 0.5–0.6: at full opacity the color COVERS the
 * piece instead of sitting on top of it, and it stops reading as a translucent object.
 * Against dark it goes to 1. The default is inferred from the surface if nothing is
 * passed.
 */

/** Noise textures with the grain in the ALPHA channel, meant to be used as a CSS
 *  mask. Each layer's color shows THROUGH the grain. Two seeds ⇒ duotone with no
 *  correlation: correlated seeds would produce a pattern, not a material.
 *
 *  `grain` is the Figma size, not the filter's `baseFrequency`: the two scales are
 *  INVERTED (see `BrandNoise` in the registry), and the conversion is the same
 *  `1 / grain` that `JavadabaLogo` applies to the seal. It's done here instead of
 *  inheriting a fixed value because until 2026-08-11 this piece ignored `grain`
 *  entirely and always painted at 0.85: a brand with coarse grain came out the same as
 *  one with fine grain. */
function noiseTexture(seed: number, grain: number): string {
  const frequency = (1 / grain).toFixed(3);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'>` +
    `<filter id='n'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0'/>` +
    `</filter>` +
    `<rect width='150' height='150' filter='url(#n)'/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** The duotone's two seeds. Layer `i` uses `SEEDS[i % 2]`. */
const SEEDS = [2, 7] as const;

/** The textures are deterministic and there's only a handful: they're computed once
 *  per (seed, grain) pair, not on every render. */
const TEXTURE_CACHE = new Map<string, string>();

function textureFor(seed: number, grain: number): string {
  const key = `${seed}|${grain}`;
  let texture = TEXTURE_CACHE.get(key);
  if (!texture) {
    texture = noiseTexture(seed, grain);
    TEXTURE_CACHE.set(key, texture);
  }
  return texture;
}

export interface AccentSurfaceProps {
  /** Registry brand (`sonus`, `aura`, …). The duotone grain comes from it. */
  brand?: string;
  /** Explicit accent. If not passed, the surface's own accent is used (`--jd-accent-*`). */
  accent?: BrandAccent;
  /** Gradient opacity. 0.5 on light surfaces, 1 on dark ones. */
  alpha?: number;
  /** Blurs what's behind it. Only makes sense if there's something behind it. */
  glass?: boolean;
  bevel?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function AccentSurface({
  brand,
  accent,
  alpha = 1,
  glass = false,
  bevel = true,
  className,
  style,
  children,
}: AccentSurfaceProps) {
  // `surfaceNoise`, NOT `noise`: the latter is the SEAL's grain, and using it here
  // would paint an 850-unit rhombus with a full-bleed panel's grain. See the registry.
  const noise = brand ? brandEntry(brand)?.surfaceNoise : undefined;

  const background = accent
    ? accentGradient(accent, -42.58, alpha)
    : // No explicit accent, so the surface's own. The angle is fixed here because it's
      // part of the recipe, not the data.
      `linear-gradient(-42.58deg, var(--jd-accent-start), var(--jd-accent-mid), var(--jd-accent-end))`;

  return (
    <div
      // `relative` goes here as a Tailwind class rather than in `.jd-accent` on
      // purpose: this way `cn()` (twMerge) resolves it and a caller asking for
      // `absolute` wins. Written in the sheet it ALWAYS won instead — out-of-layer
      // sheet beats a utility in `@layer utilities` — leaving the surface at height 0.
      // This is a real scar inherited from the landing when the piece was promoted.
      className={cn("jd-accent relative", bevel && "jd-accent-bevel", className)}
      style={{
        background,
        ...(glass
          ? {
              backdropFilter: "blur(var(--jd-glass-blur, 12px))",
              WebkitBackdropFilter: "blur(var(--jd-glass-blur, 12px))",
            }
          : {}),
        ...style,
      }}
    >
      {noise && noise.layers.length > 0 && (
        <span aria-hidden="true" className="jd-accent-noise">
          {noise.layers.map((layer, i) => {
            const texture = textureFor(SEEDS[i % SEEDS.length], noise.grain);
            return (
              <span
                key={i}
                className="jd-accent-noise-layer"
                style={
                  {
                    background: layer.color,
                    opacity: layer.opacity,
                    WebkitMaskImage: texture,
                    maskImage: texture,
                    // Desyncs the grain of each layer.
                    WebkitMaskPosition: `${i * 41}px ${i * 67}px`,
                    maskPosition: `${i * 41}px ${i * 67}px`,
                  } as CSSProperties
                }
              />
            );
          })}
        </span>
      )}
      {children}
    </div>
  );
}
