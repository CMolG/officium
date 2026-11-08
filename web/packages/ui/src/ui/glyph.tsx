import type { ReactNode, SVGProps } from "react";

/*
 * Glyph: the small stroked shapes the controls draw themselves with (a tick, a status shape, an
 * eye, a chevron). One 24-unit grid, a 2-unit round stroke in `currentColor`, so a glyph takes the
 * ink of whatever it sits in. They are decoration (`aria-hidden`): the word beside a status shape,
 * or the `aria-label` of an icon button, is what is read out.
 *
 * Status tones each have a shape of their own (check, triangle, cross, info) so they read in
 * grayscale before the color helps (Lib-Foundations § 08).
 */

export type GlyphName =
  | "check"
  | "check-circle"
  | "alert-triangle"
  | "x-circle"
  | "info-circle"
  | "clock"
  | "x"
  | "eye"
  | "eye-off"
  | "chevron-down"
  | "plus"
  | "minus"
  | "search"
  | "arrow-right"
  | "more"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "arrow-up"
  | "arrow-down"
  | "sort"
  | "undo"
  | "inbox"
  | "wifi-off";

const SHAPES: Record<GlyphName, ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.5" />
    </>
  ),
  "alert-triangle": <path d="M12 3.5l9.5 16.5h-19zM12 10v4.5M12 17.4v.1" />,
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  "info-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.9v.1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <path d="M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.7 6.7A17.7 17.7 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  ),
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  more: (
    <>
      <circle cx="5" cy="12" r="0.6" />
      <circle cx="12" cy="12" r="0.6" />
      <circle cx="19" cy="12" r="0.6" />
    </>
  ),
  "chevron-up": <path d="M6 15l6-6 6 6" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "arrow-up": <path d="M12 19V5M6 11l6-6 6 6" />,
  "arrow-down": <path d="M12 5v14M6 13l6 6 6-6" />,
  sort: <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />,
  undo: <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  "wifi-off": (
    <>
      <path d="M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2-1.5M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8a15 15 0 0 0-11.3-3.8" />
      <path d="m2 2 20 20" />
    </>
  ),
};

export interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, "name" | "children"> {
  name: GlyphName;
  /** Pixel size of the square. Default 16. */
  size?: number;
}

export function Glyph({ name, size = 16, ...rest }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      {...rest}
    >
      {SHAPES[name]}
    </svg>
  );
}
