import type { CSSProperties, ElementType, ReactNode } from "react";
import { buttonFill, gradientInk, readableAccent, vividStop } from "@javadaba/brand";

import { cn } from "./lib/cn";

/**
 * The ecosystem's four surfaces. The rule that orders them lives in
 * `doc://contracts/design-surfaces`: **dark = showcase, light = product**, plus
 * two exceptions with an owner and a date (Sonus and the desktop).
 */
export type SurfaceKind = "product" | "showcase" | "pulse" | "desktop";

export interface SurfaceAccent {
  start: string;
  mid: string;
  end: string;
}

export interface SurfaceProps {
  /** Defaults to `product`, the ecosystem's base surface. */
  kind?: SurfaceKind;
  /**
   * The app's brand accent. Comes from `accentFor(slug)` in `@javadaba/brand`, which
   * is the single source — no hex values are written by hand here.
   */
  accent?: SurfaceAccent;
  /** `pure`: the product surface on a white page with neutral stone cards (print, embeds). */
  variant?: "pure";
  /** Tag to render. `div` by default; `body` or `main` in a root layout. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Javadaba surface: the object that publishes the `--jd-*` tokens for everything
 * hanging off it.
 *
 * This is what makes a button, a card, or a field from the system look right across
 * all four surfaces without the caller having to know where it is. A `<Button>`
 * doesn't ask "am I on the landing or on the desktop?": it asks for `--jd-ink` and
 * gets it right.
 *
 * ```tsx
 * <Surface kind="showcase" accent={accentFor("sonus")}>…</Surface>
 * ```
 *
 * **They nest.** A dark island inside a light page is just another `<Surface>`:
 * through custom-property inheritance, everything inside recolors on its own. This is
 * what solves the cases that today are hand-written (an article's code block, the
 * light widget over the black homepage).
 *
 * Color does NOT travel through `style`: it travels through `data-jd-surface`, and CSS
 * resolves it. Only the accent goes inline, because it's app data and can't live in a
 * static sheet. It's hex strings, no floats — float precision in inline styles
 * is the known cause of this workspace's hydration mismatches (`app-widget.md` §
 * Coordinates).
 *
 * Six properties travel, not three: the extra ones are the vivid stop, the mark and the ink for a solid gradient fill, and
 * they are computed HERE because they depend on the surface — the same accent has to darken on
 * `product` and lighten on `desktop`. See `@javadaba/brand`'s `chroma.ts` for why `color-mix`
 * can't do it.
 */

/** The opaque page color of each surface, mirroring `tokens.css` § 2. What the mark is read
 *  against. */
const CANVAS: Record<SurfaceKind, string> = {
  product: "#FBFAF7",
  showcase: "#111111",
  pulse: "#080504",
  desktop: "#1C1C1E",
};
export function Surface({
  kind = "product",
  variant,
  accent,
  as: Tag = "div",
  className,
  style,
  children,
}: SurfaceProps) {
  return (
    <Tag
      data-jd-surface={kind}
      data-jd-variant={variant}
      className={cn("jd-surface", className)}
      style={accent ? ({ ...accentVars(accent, kind), ...style } as CSSProperties) : style}
    >
      {children}
    </Tag>
  );
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * The six custom properties an accent publishes on a given surface.
 *
 * A stop that isn't a hex —a caller passing `currentColor`, or a CSS variable— publishes the
 * three literal stops and leaves the derived three to `tokens.css`'s fallbacks. The derivation is
 * arithmetic on sRGB and there is nothing to compute from a keyword; failing there would take
 * down a page over a color it was told to inherit.
 */
function accentVars(accent: SurfaceAccent, kind: SurfaceKind): Record<string, string> {
  const stops = [accent.start, accent.mid, accent.end];
  if (!stops.every((stop) => HEX.test(stop.trim()))) {
    return { "--jd-accent-start": accent.start, "--jd-accent-mid": accent.mid, "--jd-accent-end": accent.end };
  }
  const vivid = vividStop(stops);
  const fill = buttonFill(stops);
  return {
    "--jd-accent-start": accent.start,
    "--jd-accent-mid": accent.mid,
    "--jd-accent-end": accent.end,
    "--jd-accent-vivid": vivid,
    "--jd-accent-mark": readableAccent(vivid, CANVAS[kind]),
    "--jd-accent-gradient-on": gradientInk(stops).ink,
    "--jd-accent-fill": fill.background,
    "--jd-accent-fill-on": fill.ink,
  };
}

/**
 * The accent as INK, corrected by whichever surface it lands on.
 *
 * For text and icons. An accent used as FILL (button, chip, card edge) is passed
 * through as-is: there the color is the surface, not the ink, and correcting it would
 * dull it for no reason. The mix is always against black because the only correction
 * needed is downward: what's excessive against white is luminosity.
 */
export function accentInk(color: string): string {
  return `color-mix(in oklab, ${color} var(--jd-ink-mix, 100%), #000)`;
}
