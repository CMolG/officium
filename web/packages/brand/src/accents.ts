/*
 * accents.ts — the SURFACE ACCENT of each brand. Single source of truth.
 *
 * Until 2026-08-08 a brand's color was declared in THREE places that contradicted each
 * other, and nobody was responsible for keeping them in sync:
 *
 *   1. `registry.ts` in this package — the SEAL's gradient (diamond/circle).
 *   2. `catalog.ts` in the landing — the `accent` of the card and the widget.
 *   3. Each app's own tokens — its `--primary`, invented app by app.
 *
 * Measured: Quaestio was magenta in (1), violet in (2), and indigo in (3). Creatio was
 * orange→magenta in (1) and teal→violet in (2), two different brands with the same
 * name. Tributa had three blues. It wasn't aesthetic drift: nobody could answer "what
 * color is this app?" without picking who to believe.
 *
 * ## Why the accent is NOT the seal's gradient
 *
 * They're two things with two different jobs, and that's why this file exists instead
 * of just re-exporting `registry.ts`:
 *
 * - The **seal's gradient** dresses an 850-unit diamond on a dark background. Its white
 *   stops are the object's SHINE: the light sliding along the edge.
 * - The **surface accent** dresses background gradients (`AccentSurface`), card edges,
 *   chips, and —passed through `accentInk()`— text. A white stop there isn't shine:
 *   it's a stretch that disappears on paper.
 *
 * Hence the derivation rule, which is what makes the table below auditable:
 *
 *   The accent is the seal's stops (first / middle / last). It DEPARTS from them only
 *   when a stop is white or near-white, because that stop is shine, not brand color.
 *   Every exception is written down with its reason — if there's no written reason, the
 *   accent is wrong.
 *
 * The two conflicts that were NOT white (Quaestio and Creatio) are resolved in favor of
 * the SEAL, which is what the user sees in the favicon, on the desktop, and in the
 * Marketplace: the landing's card can be repainted, a learned icon can't.
 */

import { brandEntry, type BrandGradient } from "./registry";

/** Accent triplet: what the ecosystem's surfaces consume. */
export interface BrandAccent {
  start: string;
  mid: string;
  end: string;
}

/** The seal's stops, in order, as a first/middle/last triplet. */
function fromSeal(gradient: BrandGradient): BrandAccent {
  const { stops } = gradient;
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  const middle = stops[Math.floor((stops.length - 1) / 2)]!;
  return { start: first.color, mid: middle.color, end: last.color };
}

/**
 * Exceptions to the derivation, each with its reason. This table is short ON
 * PURPOSE: if it grows, it means the seal and the surface have stopped being the
 * same brand, and that's a design problem, not a problem with this file.
 */
const OVERRIDES: Record<string, { accent: BrandAccent; reason: string }> = {
  tributa: {
    accent: { start: "#5868D3", mid: "#6A82C4", end: "#7699A5" },
    reason:
      "The seal ends in #FFFFFF (edge shine). As a surface that stretch evaporates on " +
      "paper, so the accent runs the full blue: the `mid` is the real interpolation " +
      "between the seal's two endpoints.",
  },
  fluxor: {
    accent: { start: "#E1D4B4", mid: "#E2E2E2", end: "#B8A888" },
    reason:
      "Same case as Tributa: the seal ends in white. The accent closes in dark sand so " +
      "the gradient has range and the edge shows up on a light background.",
  },
  gymnasium: {
    accent: { start: "#FF4D00", mid: "#FF6A00", end: "#FF9000" },
    reason:
      "The seal is white→white→orange: the fist shines and the color only shows up at " +
      "the end. As an accent that's 21% invisible surface, so it takes the full orange " +
      "ramp the card was already using.",
  },
  quaestio: {
    accent: { start: "#A94A8F", mid: "#F79BF5", end: "#C7B8FF" },
    reason:
      "REAL CONFLICT, not white: magenta seal against violet card. The seal wins (it's " +
      "the favicon and the desktop icon) and only its third stop, which was #FFFFFF, " +
      "gets swapped for the card's light violet — which is also the natural bridge " +
      "between the two readings.",
  },
  creatio: {
    accent: { start: "#FF5900", mid: "#F2D30B", end: "#E600FF" },
    reason:
      "REAL CONFLICT: the seal is an orange→yellow→magenta rainbow and the card declared " +
      "indigo/cyan/violet, which comes from nowhere. The seal wins; three of its five " +
      "stops are taken (endpoints + the central yellow).",
  },
  oleum: {
    accent: { start: "#E01E1E", mid: "#23DADD", end: "#DA24C1" },
    reason:
      "The seal has seven stops (it's a color wheel). The accent takes the three the " +
      "card was already using: red, cyan, and magenta — the wheel's longest span.",
  },
  oeconomicis: {
    accent: { start: "#FFD700", mid: "#D4AF37", end: "#FFDF00" },
    reason:
      "The seal opens in #FFFFFF (shine, same case as Tributa/Fluxor). The accent starts " +
      "at the first real gold instead; mid and end stay the seal's own stops.",
  },
  "javadaba-os": {
    accent: { start: "#E5F9FE", mid: "#A3C2F0", end: "#3158AB" },
    reason:
      "The `os` variant has no `gradient`: its tile is black for 60% of its diagonal, " +
      "with a pale blue corner (#DCF0F7) and a blue one (#4164B0). The accent keeps " +
      "that light-to-blue span, as it was when it was read from the helix the tile " +
      "replaced (JAVA-268), so no surface of the desktop changes color with the icon.",
  },
};

/**
 * Surface accent of a brand. `undefined` if the brand isn't in the registry — the
 * caller decides whether that's a bug or a legitimate case (an app without its own
 * seal yet).
 */
export function accentFor(brand: string): BrandAccent | undefined {
  const override = OVERRIDES[brand];
  if (override) return override.accent;

  const entry = brandEntry(brand);
  // Order of preference: the seal's fill, then the stroke. Only the BASE logo
  // (`javadaba`) needs the stroke — it's a black diamond with no fill, so its brand
  // color is the silver of the edge, which is where the `--color-brand-silver` that
  // the landing used to hand-write comes from.
  const gradient = entry?.gradient ?? entry?.stroke;
  if (!gradient) return undefined;

  return fromSeal(gradient);
}

/** The reason a brand departs from its seal, if it does. */
export function accentReason(brand: string): string | undefined {
  return OVERRIDES[brand]?.reason;
}

/**
 * CSS gradient of the accent.
 *
 * `angle` in CSS convention (not Figma): 135° is the one used by cards and edges,
 * −42.58° is the one used by the widget's accent surface (`app-widget.md`). `alpha`
 * lowers the opacity of all three stops at once — 0.5–0.6 over light surfaces, 1 over
 * dark ones, which is what keeps the color from COVERING the piece instead of sitting
 * on top of it.
 */
export function accentGradient(accent: BrandAccent, angle = 135, alpha = 1): string {
  const stop = (hex: string) =>
    alpha >= 1 ? hex : `color-mix(in oklab, ${hex} ${Math.round(alpha * 100)}%, transparent)`;
  return `linear-gradient(${angle}deg, ${stop(accent.start)}, ${stop(accent.mid)}, ${stop(accent.end)})`;
}
