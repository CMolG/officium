/*
 * constants.ts — conversion of Figma values to the relative system.
 *
 * KEY IDEA: we model the whole brand inside an SVG with `viewBox="0 0 850 850"`.
 * That way Figma's pixels stop being absolute and become viewBox UNITS: they scale
 * to any size (the consumer only sets width/height). The outer box's "850" is the
 * reference unit; everything else is relative to it (e.g. radius 100 = 11.76% of
 * the side).
 *
 * Origin in Figma (base logo "javadaba", the color-trapping diamond concept):
 *   - Outer square:   W/H 850, radius 100. Black background + mono noise AAAAAA@25%.
 *   - Inner diamond:  a 400×400 square with radius 16 ROTATED 45°, centered.
 *                     (base) fill #000 + stroke 11 with gradient.
 *   - Diamond shadows: shared across ALL icons (see DIAMOND_SHADOWS).
 *   - lucide icon:    256×256 centered, stroke 21.33 (= native stroke 2 on
 *                     lucide's 24 grid, because 21.33 = 2 × 256/24).
 *
 * Figma → SVG shadow conversion: a Figma drop-shadow's "blur" is equivalent to the
 * CSS blur radius, and in SVG `stdDeviation = blur / 2`.
 */

/** Side of the outer box = the viewBox's reference unit. */
export const CANVAS = 850;
/** Corner radius of the outer box (100/850 = 11.76%). */
export const CANVAS_RADIUS = 100;

/** Side of the square that, rotated 45°, forms the diamond (400/850 = 47.06%). */
export const DIAMOND_SIDE = 400;
/** Corner radius of the diamond (16/850 = 1.88% of the canvas; 4% of its own side). */
export const DIAMOND_RADIUS = 16;
/** Top-left corner of the diamond's square: (850-400)/2. */
export const DIAMOND_POS = (CANVAS - DIAMOND_SIDE) / 2; // 225
/** Center of the canvas (and of the diamond). */
export const CENTER = CANVAS / 2; // 425
/** Stroke width of the base diamond (only "mark"): 11/850 = 1.29%. */
export const STROKE_WIDTH = 11;

/** Radius of the APIs' circle. Optical parity with the diamond (similar mass to
 *  the rotated 400×400 square; adjustable ±15 with visual verification). */
export const CIRCLE_RADIUS = 240;

/**
 * Half-length of the gradient vector, measured on the diamond's ON-SCREEN bounding
 * box (a 400 square rotated 45° has a diagonal of 400·√2 → half 282.84). With this
 * a 90° (vertical) gradient spreads 0%→100% from tip to tip.
 */
export const DIAMOND_HALF_SPAN = (DIAMOND_SIDE * Math.SQRT2) / 2; // 282.84

/** lucide icon in diamond variants: 256/850 = 30.1% of the canvas, centered. */
export const ICON_SIZE = 256;
export const ICON_POS = (CANVAS - ICON_SIZE) / 2; // 297
/**
 * lucide stroke in diamond variants, expressed on the native 24 grid:
 * 21.33 (at 256) = 2 × (256/24) ⇒ native strokeWidth = 2 (lucide's default).
 */
export const ICON_STROKE = 2;

/** The glass seal's glyph: 500/850 = 58.8% of the canvas. */
export const ICON_SIZE_BG = 500;
export const ICON_POS_BG = (CANVAS - ICON_SIZE_BG) / 2; // 175
/** Its stroke, 30 (at 500) = 1.44 on the 24 grid: 30 / (500/24). */
export const ICON_STROKE_BG = 30 / (ICON_SIZE_BG / 24); // 1.44

/** Mono background noise (identical across the base logo and icons): AAAAAA @25%. */
export const NOISE_COLOR = "#AAAAAA";
export const NOISE_OPACITY = 0.25;
/** feTurbulence parameters (copied from the landing's lib/app-theme.ts). */
export const NOISE_BASE_FREQUENCY = 0.85;
export const NOISE_OCTAVES = 2;

/** A shadow layer already converted to SVG units (stdDeviation = blur/2). */
export interface ShadowLayer {
  dx: number;
  dy: number;
  /** SVG stdDeviation (= Figma blur / 2). */
  std: number;
  color: string;
  opacity: number;
}

/**
 * Shadows of the spinner's and the API seal's diamond or circle. Figma origin:
 *   drop x0 y4  blur12.3  #000000 100%
 *   drop x0 y0  blur31.5  #8F8F8F 63%
 * Figma's third layer, a wide white halo (x0 y10 blur111.5 #FFFFFF 50%), is left out: on light
 * pages it washed out the stroke at the tips and the diamond looked cut off at the corners
 * (about page, 2026-07-05).
 */
export const DIAMOND_SHADOWS: ShadowLayer[] = [
  { dx: 0, dy: 0, std: 31.5 / 2, color: "#8F8F8F", opacity: 0.63 },
  { dx: 0, dy: 4, std: 12.3 / 2, color: "#000000", opacity: 1 },
];

/**
 * Inner shadow of the lucide icons (subtle inner relief). Figma origin (relative to
 * the 256 icon): inner x0 y4 blur6.6 spread1 #717171 100%.
 *
 * WATCH the coordinate space: the filter is applied to the lucide glyph on its LOCAL
 * 24 grid (the <g> wrapping it carries scale(ICON_SIZE/24)), and the filter
 * primitives' lengths are interpreted in THAT scaled space. That's why we convert
 * Figma's values (256 px) to the 24 grid (×24/256): used as-is, the shadow comes out
 * ~10× too large and grays out the whole icon. Living on the 24 grid also makes it
 * scale the same way in the spinner (256) and the glass seal (500).
 */
const ICON_GRID = 24;
const FIGMA_ICON_PX = 256;
const TO_ICON_GRID = ICON_GRID / FIGMA_ICON_PX; // 0.09375
export const ICON_INNER_SHADOW = {
  dx: 0,
  dy: 4 * TO_ICON_GRID, // 0.375
  std: (6.6 / 2) * TO_ICON_GRID, // 0.309
  spread: 1 * TO_ICON_GRID, // 0.094
  color: "#717171",
  opacity: 1,
} as const;

/* ── "os" variant: the dotted "OS" tile ──────────────────────────────────────
 *
 * The Javadaba OS mark: no diamond and no pictogram, just "OS" in a dot-matrix face on a
 * graphite tile. Since wave 7 the tile is the one Lib-Brand 11 draws: #1C1C1E, a 26% corner, a
 * field of 55% white dots on an 8 px pitch of a 128 px tile and a one-pixel top light. It replaced
 * the user's 2026-10-02 reference (a black diagonal with two colored corners, `reference/` in
 * git history), which the design superseded. The letters keep the square-dot drawing below,
 * because there are no typefaces outside the browser.
 */

/** The 128 px tile of the design, in canvas units. */
const FROM_DESIGN = CANVAS / 128;

export const OS_TILE = {
  fill: "#1C1C1E",
  radius: 0.26 * CANVAS,
  /** The dot field: radial-gradient(circle, rgba(255,255,255,.55) 0 1.4px, transparent 1.8px) on 8px. */
  dots: { pitch: 8 * FROM_DESIGN, radius: 1.5 * FROM_DESIGN, opacity: 0.55 },
  /** inset 0 1px 0 rgba(255,255,255,.12). */
  topLight: { height: FROM_DESIGN, opacity: 0.12 },
} as const;

/** The colors the OS seal stage is made of: the tile's old diagonal, which the stage kept. */
export const OS_STAGE_COLORS = ["#DCF0F7", "#000000", "#000000", "#4164B0"] as const;

/**
 * "OS" in Doto SemiBold with its `ROND` axis at 0, which makes every dot a square:
 * a 5 x 7 matrix per letter and one empty column between letters. Drawn as squares
 * and never as `<text>`, because there are no typefaces outside the browser: the
 * favicon and the apple-touch icon are rasterized by librsvg, which has no Doto and
 * ignores an embedded `@font-face` (measured 2026-08-13, when a `<text>` came out in
 * a system serif).
 *
 * 26-unit dots on a 37.625 pitch. The design centers the word in the tile (grid
 * `place-items: center`): the block spans x 224-626 and y 294-557, around (425, 425).
 */
export const OS_DOT = {
  x: 224,
  y: 294,
  pitch: 37.625,
  size: 26,
  /** Columns a letter takes, its empty spacing column included. */
  advance: 6,
} as const;

/** Each letter's rows, top to bottom; `#` is a dot. Only the letters a brand uses. */
export const OS_DOT_GLYPHS: Record<string, readonly string[]> = {
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  S: [".###.", "#...#", "#....", ".###.", "....#", "#...#", ".###."],
};
