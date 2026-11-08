import type { CSSProperties, ReactNode } from "react";

import { cn } from "../lib/cn";
import { inkOn } from "../lib/luminance";
import type { BadgeAxes, BadgeRegister, BadgeSize, BadgeTone } from "./badge.shared";
import { Glyph, type GlyphName } from "./glyph";

/*
 * Badge — the ecosystem's status label (Lib-Display § Badge: chips speak, tags label).
 *
 * A CHIP is a pill in the reading register (28 tall, 13 / 600); a TAG is a small square label for
 * dense tables and cards (22 tall, 11 / 600, capitals). Tone and fill change emphasis; the word is
 * always there, and a status tone on a chip adds its SHAPE too (a tick, a warning triangle, a cross,
 * an info circle), so Paid / Due soon / Failed / Beta read in grayscale and to a screen reader
 * before the color helps.
 *
 * The `tone` axis is SEMANTIC, not chromatic: whoever uses it says "this turned out fine," not "this
 * is green." The four status tones are fixed pairs (ink + tint) from `tokens.css`, the same on every
 * surface on purpose: an error's red has to be the same on the dark desktop and on a light invoice.
 *
 * Fills: `none` is a 1 px outline in the tone's ink, `subtle` its tint, `solid` the ink as a fill
 * (warning's solid is the amber #FFB27A with dark ink, because white on it fails). A neutral solid is
 * the ink; an accent solid is the product's gradient.
 */

export type { BadgeTone, BadgeRegister, BadgeSize } from "./badge.shared";

export interface BadgeProps extends BadgeAxes {
  /** The status shape before the word. Default: on for a status tone on a chip, off elsewhere. */
  icon?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

const REGISTERS: Record<BadgeRegister, string> = {
  chip: "rounded-full font-[family-name:var(--font-jd-body)] text-[13px]",
  tag: "rounded-md font-[family-name:var(--font-jd-body)] text-[11px] uppercase tracking-[0.02em]",
};

/** Each register's own density, and the three steps a caller may ask for instead. */
const SIZES: Record<BadgeRegister, Record<BadgeSize | "default", string>> = {
  chip: { default: "h-7 px-3", xs: "h-6 px-2.5 text-xs", sm: "h-[26px] px-3 text-xs", md: "h-7 px-3" },
  tag: { default: "h-[22px] px-[7px]", xs: "h-5 px-1.5 text-[10px]", sm: "h-[22px] px-[7px]", md: "h-6 px-2 text-xs" },
};

type Status = Exclude<BadgeTone, "neutral" | "accent">;
const STATUS: Record<Status, { ink: string; tint: string; shape: GlyphName; solidFill?: string; solidInk?: string }> = {
  success: { ink: "var(--jd-ok)", tint: "var(--jd-ok-bg)", shape: "check" },
  warning: {
    ink: "var(--jd-warn)",
    tint: "var(--jd-warn-bg)",
    shape: "alert-triangle",
    solidFill: "var(--jd-warn-solid)",
    solidInk: "#111111",
  },
  danger: { ink: "var(--jd-bad)", tint: "var(--jd-bad-bg)", shape: "x" },
  info: { ink: "var(--jd-info)", tint: "var(--jd-info-bg)", shape: "info-circle" },
};

const ring = (color: string) => `inset 0 0 0 1px ${color}`;

function neutralLook(fill: string): CSSProperties {
  if (fill === "solid") return { background: "var(--jd-ink)", color: "var(--jd-page)" };
  if (fill === "subtle") return { background: "var(--jd-card)", color: "var(--jd-ink)" };
  return { boxShadow: ring("var(--jd-control-border)"), color: "var(--jd-ink)" };
}

function accentLook(fill: string, accent: string | undefined): CSSProperties {
  const base = accent ?? "var(--jd-accent)";
  if (fill === "solid") {
    return accent
      ? { background: accent, color: inkOn(accent) }
      : { background: "var(--jd-accent-fill)", color: "var(--jd-accent-fill-on, #fff)" };
  }
  if (fill === "subtle") {
    return { background: `color-mix(in oklab, ${base} 40%, #fff)`, color: `color-mix(in oklab, ${base} 32%, #000)` };
  }
  return { boxShadow: ring(`color-mix(in oklab, ${base} 45%, #000)`), color: `color-mix(in oklab, ${base} 40%, #000)` };
}

function statusLook(tone: Status, fill: string): CSSProperties {
  const { ink, tint, solidFill, solidInk } = STATUS[tone];
  if (fill === "solid") return { background: solidFill ?? ink, color: solidInk ?? "#ffffff" };
  if (fill === "subtle") return { background: tint, color: ink };
  return { boxShadow: ring(ink), color: ink };
}

export function Badge({
  register = "chip",
  tone = "neutral",
  accent,
  fill: fillProp,
  solid = false,
  size,
  icon,
  className,
  style,
  children,
}: BadgeProps) {
  const fill = fillProp ?? (solid ? "solid" : "none");
  const look =
    tone === "neutral" ? neutralLook(fill) : tone === "accent" ? accentLook(fill, accent) : statusLook(tone, fill);
  const isStatus = tone !== "neutral" && tone !== "accent";
  const showShape = isStatus && (icon ?? register === "chip");

  return (
    <span
      data-jd-badge={tone}
      className={cn(
        "inline-flex flex-row items-center gap-1.5 whitespace-nowrap font-semibold leading-none",
        REGISTERS[register],
        SIZES[register][size ?? "default"],
        className,
      )}
      style={{ ...look, ...style }}
    >
      {showShape ? <Glyph name={STATUS[tone as Status].shape} size={13} strokeWidth={2.3} /> : null}
      {children}
    </span>
  );
}
