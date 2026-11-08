/*
 * The axes of `Badge` on both runtimes. The web half paints them with `color-mix()`, which React
 * Native cannot, so each half keeps its own table; the NAMES live here and cannot drift.
 */

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
export type BadgeRegister = "chip" | "tag";
export type BadgeSize = "xs" | "sm" | "md";
export type BadgeFill = "none" | "subtle" | "solid";

/**
 * Status inks. Fixed on purpose: an error is red across all four surfaces and on Android. The web
 * half reads the same values from `tokens.css` (`--jd-ok`, `--jd-warn`, `--jd-bad`, `--jd-info`) and
 * their tints (`--jd-*-bg`); this table is the native half's.
 */
export const STATUS_TONES = {
  success: "#1E6B45",
  warning: "#9A4300",
  danger: "#A1261E",
  info: "#22508F",
} as const;

export interface BadgeAxes {
  /** Marketing chip (default) or app tag. */
  register?: BadgeRegister;
  tone?: BadgeTone;
  /** Explicit accent for `tone="accent"`. Defaults to the surface's own. */
  accent?: string;
  /** How much of the tone the badge wears. */
  fill?: BadgeFill;
  /** Older spelling of `fill="solid"`. */
  solid?: boolean;
  size?: BadgeSize;
  className?: string;
}
