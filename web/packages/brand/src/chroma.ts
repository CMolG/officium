/*
 * chroma.ts — the ecosystem's color arithmetic.
 *
 * It exists because until 2026-08-23 there was exactly one operation available on a brand
 * accent, and it was written in CSS: `color-mix(in oklab, <accent> 58%, #000)`, the
 * `--jd-accent-ink` of `packages/ui/tokens.css`. Mixing toward black in OKLab drops lightness
 * AND chroma at the same time, so on a pale accent it doesn't darken the color, it launders it:
 * Curriculum's `#FFCEA1` came out `#7A614B` — a brown — and the product's accent period, which
 * IS half of its wordmark, was painted in a color the brand does not own. That is the
 * 2026-08-23 report, "why doesn't the dot use the accent color".
 *
 * What's here is the part CSS can't do and the part that shouldn't be redone per app:
 *
 *  - **OKLCH**, where lightness and chroma are separate axes, so "the same color, darker" is a
 *    single coordinate change instead of a mix that also drains it.
 *  - **Which stop of the three is the brand**, measured by chroma rather than picked by hand.
 *  - **WCAG contrast**, so a floor is checked and not eyeballed.
 *
 * No dependency: OKLab is ~20 lines of matrix multiplication (Björn Ottosson's published
 * coefficients) and WCAG relative luminance is four. Pulling a color library into eight
 * projects and a root lockfile to avoid writing them would fail step 3 of the laziness
 * algorithm, not pass it.
 *
 * <b>This is not a duplicate of `packages/ui/src/lib/luminance.ts`.</b> That one answers ONE
 * question —black ink or white ink on top of this fill— and it answers it about the color as it
 * appears in the accent-surface recipe, over a 42% white base. This one is about the color
 * itself. Both are exported and neither should grow into the other.
 */

/** A color in OKLCH: lightness 0..1, chroma 0..~0.4, hue in degrees. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

function srgbToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
  const v = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

/** `#abc` / `#aabbcc` → the three 0..255 channels. Throws on anything else: a malformed brand
 *  color is a bug in the registry, and returning black for it would hide it. */
function channels(hex: string): [number, number, number] {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex color: ${hex}`);
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** sRGB hex → OKLCH. */
export function toOklch(hex: string): Oklch {
  const [r, g, b] = channels(hex).map(srgbToLinear) as [number, number, number];

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const hue = (Math.atan2(okB, okA) * 180) / Math.PI;
  return { l: okL, c: Math.hypot(okA, okB), h: hue < 0 ? hue + 360 : hue };
}

/**
 * OKLCH → sRGB hex.
 *
 * Out-of-gamut values are CLAMPED per channel, which is what the browser does with
 * `oklch()` too. It matters here because reducing lightness at constant chroma can leave the
 * sRGB cube on saturated hues; clamping shifts the result slightly rather than failing, and the
 * shift is small at the lightnesses this module actually asks for.
 */
export function fromOklch({ l, c, h }: Oklch): string {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const lCube = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mCube = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sCube = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const red = 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube;
  const green = -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube;
  const blue = -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube;

  return (
    "#" +
    [red, green, blue]
      .map((channel) => linearToSrgb(channel).toString(16).padStart(2, "0").toUpperCase())
      .join("")
  );
}

/** WCAG 2.2 relative luminance of a hex color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map(srgbToLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.2 contrast ratio between two hex colors, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

/**
 * The same color, dark enough to be seen against `against`, with its hue and chroma intact.
 *
 * Binary search on lightness alone. That is the whole point: `color-mix(… , #000)` moves L and
 * C together, so a pale accent loses the very thing that identified it. Here `#FFCD50` at the
 * floor is still unmistakably Curriculum's gold; mixed toward black it was a brown.
 *
 * `floor` defaults to **3:1**, the WCAG 2.2 threshold for a graphical object or a UI component
 * (1.4.11) and not the 4.5:1 for body text — because what this is for is a MARK: a wordmark's
 * accent period, a seal, a dot beside a label. Text keeps using `--jd-accent-ink`. Passing 4.5
 * gets text-grade ink with the hue preserved, which is the right call for an accent used as a
 * link color.
 *
 * If the color already clears the floor it is returned untouched — never darkened "for safety",
 * because on a dark surface that would be darkening away from legibility.
 */
export function readableAccent(hex: string, against = "#FFFFFF", floor = 3): string {
  if (contrastRatio(hex, against) >= floor) return hex;

  const source = toOklch(hex);
  const target = relativeLuminance(against) > 0.5 ? 0 : 1;
  let lo = Math.min(source.l, target);
  let hi = Math.max(source.l, target);
  let best = fromOklch({ ...source, l: target });

  // 12 halvings resolve lightness to ~0.0002, well past what 8-bit sRGB can express.
  for (let i = 0; i < 12; i += 1) {
    const mid = (lo + hi) / 2;
    const candidate = fromOklch({ ...source, l: mid });
    if (contrastRatio(candidate, against) >= floor) {
      // Keep the LIGHTEST (or darkest, on a dark surface) value that still passes: the closer
      // to the original lightness, the more of the brand survives.
      best = candidate;
      if (target === 0) lo = mid;
      else hi = mid;
    } else if (target === 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

/**
 * The stop that carries the brand, out of a gradient's three.
 *
 * Measured by chroma, not chosen: the accent's `mid` is the interpolation and is frequently the
 * washed-out one (Curriculum's `#FFCEA1` against its own `#FFCD50`), so a mark built from `mid`
 * reads as a neutral. Ties go to the first, which keeps the answer stable for a monochrome
 * accent instead of depending on iteration order.
 */
export function vividStop(stops: readonly string[]): string {
  let best = stops[0]!;
  let bestChroma = -1;
  for (const stop of stops) {
    const { c } = toOklch(stop);
    if (c > bestChroma) {
      best = stop;
      bestChroma = c;
    }
  }
  return best;
}

/**
 * The ink that reads on a SOLID gradient fill: black or white, whichever has the higher minimum
 * WCAG contrast over every stop, plus that minimum.
 *
 * Not `inkOn` on the darkest stop: `inkOn` models the accent surface's 42% white base, which a
 * button painted straight from the stops does not have. It says white for Creatio (1.49:1)
 * where black gives 5.81:1. `contrast >= 4.5` means the gradient admits AA ink at all.
 */
export function gradientInk(stops: readonly string[]): { ink: "#000000" | "#FFFFFF"; contrast: number } {
  const floor = (ink: string) => Math.min(...stops.map((stop) => contrastRatio(stop, ink)));
  const black = floor("#000000");
  const white = floor("#FFFFFF");
  return black >= white ? { ink: "#000000", contrast: black } : { ink: "#FFFFFF", contrast: white };
}

/** What a gradient button is painted with: one solid accent ink under a white label. */
export interface ButtonFillSpec {
  /** The solid color. White passes AA on it. */
  background: string;
  /** The label color: always white. */
  ink: "#FFFFFF";
}

/**
 * The fill of a gradient button (Lib-Controls, "Button, gradients without an AA label"). The owner chose
 * Option 1 on 2026-10-29 (MIG-X08): no label color is AA on a whole brand ramp, so a button fills with the
 * product's solid accent ink and the gradient stays on surfaces that carry no text. The ink is the most
 * chromatic stop of the ramp once each stop is deepened, hue and chroma kept, until white passes 4.5:1
 * (Tributa's is its first stop, #5868D3, as the board draws it).
 *
 * Pure, so it is computed at build time (`themeVars`, `accentFill`) and a test can walk every accent.
 */
export function buttonFill(stops: readonly string[]): ButtonFillSpec {
  const ink = "#FFFFFF";
  const deep = stops.map((stop) => readableAccent(stop, ink, 4.5));
  const solid = deep.reduce((best, stop) => (toOklch(stop).c > toOklch(best).c ? stop : best));
  return { background: solid, ink };
}
