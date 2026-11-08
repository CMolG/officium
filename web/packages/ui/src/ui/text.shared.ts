import { cn } from "../lib/cn";
import { TYPE_SCALE, type TypeRole } from "../lib/type-scale";

/*
 * What `Text` means on both runtimes: the element it stands for and the classes each axis adds.
 * `text.tsx` (web) and `text.native.tsx` (Android) render it; neither decides a class on its own,
 * so the two cannot drift.
 */

/** The text elements a call site can ask for. On Android every one of them is a `<Text>`. */
export type TextElement = "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "strong" | "em" | "small";

export interface TextAxes {
  /**
   * A step of the type scale (`lib/type-scale.ts`: display-xl .. display-xs, kicker, body-l/m/s, ui, caption,
   * italic-*, hand-*). It sets family, size, weight and line height at once; `size`, `weight` and
   * `font` after it still override.
   */
  type?: TypeRole;
  /** The element on the web; on Android a heading keeps its level for assistive technology. */
  as?: TextElement;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  /** Ink from the surface (`--jd-*`): the tokens already pass AA against their background. */
  tone?: "fg" | "muted" | "faint" | "accent";
  weight?: "regular" | "medium" | "semibold" | "bold";
  /** A role of the voice (`doc://contracts/design-system/tokens`, Voice). `hand` is left out: it has three uses. */
  font?: "body" | "kicker" | "display" | "italic" | "serif";
  className?: string;
}

// Literal class strings, so Tailwind's scanner sees every one (`@source` on packages/ui).
const SIZES = {
  xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg",
  xl: "text-xl", "2xl": "text-2xl", "3xl": "text-3xl", "4xl": "text-4xl",
} as const;
const TONES = {
  fg: "text-[color:var(--jd-ink)]",
  muted: "text-[color:var(--jd-muted)]",
  faint: "text-[color:var(--jd-faint)]",
  accent: "text-[color:var(--jd-accent-ink)]",
} as const;
const WEIGHTS = { regular: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" } as const;
const FONTS = {
  body: "font-[family-name:var(--font-jd-body)]",
  // The kicker voice: Montserrat 700 in capitals, +16% tracking. A `size` or `weight` axis still wins.
  kicker: "font-[family-name:var(--font-jd-kicker)] text-[11px] font-bold uppercase tracking-[0.16em]",
  display: "font-[family-name:var(--font-jd-display)]",
  italic: "font-[family-name:var(--font-jd-italic)] italic",
  serif: "font-[family-name:var(--font-jd-serif)]",
} as const;

/**
 * No axis set adds no class: `<Text>` is then exactly the `<span>` (or `as`) the call site had,
 * which is what lets a loose string be wrapped with zero visual change.
 */
export function textClasses({ type, size, tone, weight, font, className }: TextAxes): string | undefined {
  // The voice and the type step come first, so an explicit size, tone or weight overrides them.
  return (
    cn(type && TYPE_SCALE[type], font && FONTS[font], size && SIZES[size], tone && TONES[tone], weight && WEIGHTS[weight], className) ||
    undefined
  );
}

/** The heading level of `as`, for `role="heading"` + `aria-level` where there is no `<h*>`. */
export const headingLevel = (as: TextElement | undefined) => (as && /^h[1-6]$/.test(as) ? Number(as[1]) : undefined);
