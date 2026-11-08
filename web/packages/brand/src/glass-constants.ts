/*
 * glass-constants.ts — the glass seal's Figma values, in the 850-unit viewBox.
 *
 * Given by the user on 2026-10-22 as GLOBAL effects: one recipe for every product, so a brand
 * declares only its background colors (`glass` in registry.ts) and nothing here is per brand.
 * Figma blur -> SVG `stdDeviation` is blur / 2, as everywhere else in this package.
 *
 * Geometry is the user's 1:1 exports (`glass logos/shape.svg`, `glass.svg`, the 850 px PNGs).
 */

import type { ShadowLayer } from "./constants";
import type { BrandNoise } from "./registry";

/**
 * Inner shadow X15 Y15 blur 40 #FFFFFF 33%. The same on the shape and the glass pane, and, from
 * 2026-10-22 on every glass piece: the light comes from the top left on each of them.
 */
export const GLASS_INNER_SHADOW = { dx: 15, dy: 15, std: 40 / 2, color: "#FFFFFF", opacity: 0.33 } as const;

/** The background shape: the outline of `shape.svg`, in that file's own coordinates. */
export const GLASS_SHAPE_PATH =
  "M922.066 969.974C974.898 601.505 363.355 328.955 156.876 526.286C-49.6029 723.617 205.292 241.406 510.703 126.306C816.114 11.2059 1205.63 114.689 1246.61 509.698C1287.59 904.707 869.235 1338.44 922.066 969.974Z";

/** Where `shape.svg` sits on the 850 tile: it overflows left, right and bottom, as in the PNGs. */
export const GLASS_SHAPE_OFFSET = { x: -327, y: -70 } as const;

/**
 * Where each color ramp starts and ends, in canvas units, measured on the PNGs (Oleum's seven
 * colors make the positions readable). The background spans the tile's diagonal. The shape's
 * ramp starts above its visible top and ends below the tile, so its first color only shows where
 * the shape is clipped: at y 60 the PNGs sit a quarter of the way along the list.
 */
export const GLASS_BACKGROUND_RAMP = { x1: 0, y1: 0, x2: 850, y2: 850 } as const;
export const GLASS_SHAPE_RAMP = { x1: 0, y1: -215, x2: 0, y2: 1060 } as const;

/** Shape drop shadow X0 Y0 blur 82 #000000 25%. No grain on the shape: only the background has it. */
export const GLASS_SHAPE_SHADOWS: ShadowLayer[] = [{ dx: 0, dy: 0, std: 82 / 2, color: "#000000", opacity: 0.25 }];

/**
 * The glass pane: a 700 square, radius 80, centered. Its fill is the smoke the design's renders show
 * inside the pane (Lib-Brand 11): fitted over the 18 product seals, the pane reads as the frosted
 * backdrop under a mid gray at about half opacity, where the old 10% white left every pane some 40
 * per channel too light.
 */
export const GLASS_PANE = { pos: 75, side: 700, radius: 80, fill: "#8A8A8A", fillOpacity: 0.5 } as const;

/**
 * The grade of the colors behind the pane (background and shape): the design's tiles are deeper and
 * more saturated than the registry's colors drawn flat. `saturate` is the feColorMatrix value, `gain`
 * the linear slope after it.
 */
export const GLASS_GRADE = { saturate: 1.2, gain: 0.94 } as const;

/**
 * Pane drop shadow X0 Y4 blur 27 spread 4 #000000 25%. The spread is not drawn: 4 units under a
 * 13.5 blur is invisible at any size this seal ships at, and `feMorphology` is the one primitive
 * librsvg makes slow (JAVA-789).
 */
export const GLASS_PANE_SHADOWS: ShadowLayer[] = [{ dx: 0, dy: 4, std: 27 / 2, color: "#000000", opacity: 0.25 }];

/**
 * Figma's Glass effect (refraction, depth, dispersion, frost and splay at max, -45° at 80%) has no
 * SVG primitive. What it does to the backdrop is frost it, and that is what is drawn: the
 * background and shape again, blurred, inside the pane. The rim it refracts is a hairline of
 * light along the pane's edge.
 */
export const GLASS_FROST_STD = 40;
export const GLASS_RIM = { width: 2, opacity: 0.35 } as const;

/**
 * The lucide glyph's effects, at the 500-unit glyph of the app-friendly tile:
 * drop shadow X0 Y0 blur 36 #000000 25%, inner shadow X0 Y5 blur 25 spread 1.95 #717171 100%.
 * The inner shadow runs on lucide's 24 grid (see `ICON_INNER_SHADOW`), so it is scaled to it.
 */
export const GLASS_GLYPH_SHADOWS: ShadowLayer[] = [{ dx: 0, dy: 0, std: 36 / 2, color: "#000000", opacity: 0.25 }];
const TO_GRID = 24 / 500;
export const GLASS_GLYPH_INNER_SHADOW = {
  dx: 0,
  dy: 5 * TO_GRID,
  std: (25 / 2) * TO_GRID,
  spread: 1.95 * TO_GRID,
  color: "#717171",
  opacity: 1,
} as const;

/**
 * The global grain: duo #FFFFFF, size 1.4, on every glass background, no exception. The figures are the user's
 * 31% and 25% at a fifth, because librsvg and the browser draw the turbulence lighter than Figma does: at the
 * full figures the tiles read about 10 per channel lighter than the design's renders; at a fifth the mean
 * matches and the grain is still there.
 */
export const GLASS_NOISE: BrandNoise = {
  grain: 1.4,
  layers: [
    { color: "#FFFFFF", opacity: 0.06 },
    { color: "#FFFFFF", opacity: 0.05 },
  ],
};
