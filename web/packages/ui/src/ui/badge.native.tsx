import type { ReactNode } from "react";
import { Text as NativeText, View, type StyleProp, type ViewStyle } from "react-native";

import { cn } from "../lib/cn";
import { inkOn } from "../lib/luminance";
import type { BadgeAxes, BadgeRegister, BadgeSize } from "./badge.shared";

/*
 * Badge on Android: the hairline box and the small-caps label, with the web's tones and fills by
 * name. `color-mix()` does not exist here, so a tone is a literal class per fill level (status
 * colors are fixed hex on purpose, as on the web) and the `subtle` wash is the tone at low alpha.
 * A status is never color alone: the label is the word.
 */

export interface BadgeProps extends BadgeAxes {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const BASE = "flex flex-row items-center self-start gap-1.5 border";
const REGISTERS: Record<BadgeRegister, string> = {
  chip: "rounded-[var(--radius-jd-md)]",
  tag: "rounded-[var(--radius-jd-sm)]",
};
const REGISTER_SIZE: Record<BadgeRegister, string> = { chip: "px-2 py-0.5", tag: "px-2.5 py-1" };
const SIZES: Record<BadgeSize, string> = { xs: "px-2 py-0.5", sm: "px-2.5 py-0.5", md: "px-2.5 py-1" };
const LABEL: Record<BadgeRegister, string> = {
  chip: "text-xs uppercase tracking-widest font-[family-name:var(--font-jd-kicker)]",
  tag: "text-xs font-medium font-[family-name:var(--font-jd-body)]",
};

// Each tone: [box, ink] for none, subtle and solid. Literal strings so the scanner sees them.
type Look = { box: string; ink: string; wash?: string };
const NEUTRAL = {
  none: { box: "border-[color:var(--jd-line)] bg-transparent", ink: "text-[color:var(--jd-muted)]" },
  subtle: { box: "border-transparent bg-[color:var(--jd-ink)]/[0.08]", ink: "text-[color:var(--jd-ink)]" },
  solid: { box: "border-[color:var(--jd-ink)] bg-[color:var(--jd-ink)]", ink: "text-[color:var(--jd-page)]" },
} satisfies Record<string, Look>;
// The accent is set at runtime (`vars(brandVars())`), where a `/alpha` modifier paints black: its
// alpha is an overlay (`wash`) with `opacity` instead.
const ACCENT = {
  none: {
    box: "border-transparent bg-transparent",
    wash: "border border-[color:var(--jd-accent)] opacity-55",
    ink: "text-[color:var(--jd-accent-ink)]",
  },
  subtle: {
    box: "border-transparent",
    wash: "bg-[color:var(--jd-accent)] opacity-15",
    ink: "text-[color:var(--jd-accent-ink)]",
  },
  solid: { box: "border-[color:var(--jd-accent)] bg-[color:var(--jd-accent)]", ink: "text-black" },
} satisfies Record<string, Look>;
const STATUS = {
  success: {
    none: { box: "border-[#1E6B45]/55 bg-transparent", ink: "text-[#1E6B45]" },
    subtle: { box: "border-transparent bg-[#1E6B45]/15", ink: "text-[#1E6B45]" },
    solid: { box: "border-[#1E6B45] bg-[#1E6B45]", ink: "text-white" },
  },
  warning: {
    none: { box: "border-[#9A4300]/55 bg-transparent", ink: "text-[#9A4300]" },
    subtle: { box: "border-transparent bg-[#9A4300]/15", ink: "text-[#9A4300]" },
    solid: { box: "border-[#9A4300] bg-[#9A4300]", ink: "text-white" },
  },
  danger: {
    none: { box: "border-[#A1261E]/55 bg-transparent", ink: "text-[#A1261E]" },
    subtle: { box: "border-transparent bg-[#A1261E]/15", ink: "text-[#A1261E]" },
    solid: { box: "border-[#A1261E] bg-[#A1261E]", ink: "text-white" },
  },
  info: {
    none: { box: "border-[#22508F]/55 bg-transparent", ink: "text-[#22508F]" },
    subtle: { box: "border-transparent bg-[#22508F]/15", ink: "text-[#22508F]" },
    solid: { box: "border-[#22508F] bg-[#22508F]", ink: "text-white" },
  },
} satisfies Record<string, Record<string, Look>>;

export function Badge({
  register = "chip",
  tone = "neutral",
  accent,
  fill: fillProp,
  solid = false,
  size,
  className,
  style,
  children,
}: BadgeProps) {
  const level = fillProp ?? (solid ? "solid" : "none");
  const look: Look = tone === "neutral" ? NEUTRAL[level] : tone === "accent" ? ACCENT[level] : STATUS[tone][level];
  // An explicit accent is a hex the classes cannot name: it is painted inline.
  const explicit = tone === "accent" && accent;
  const boxStyle = explicit
    ? level === "solid"
      ? { backgroundColor: accent, borderColor: accent }
      : level === "subtle"
        ? { backgroundColor: `${accent}26` }
        : { borderColor: `${accent}8c` }
    : undefined;
  const inkStyle = explicit && level === "solid" ? { color: inkOn(accent) } : undefined;

  return (
    <View
      className={cn(BASE, REGISTERS[register], size ? SIZES[size] : REGISTER_SIZE[register], look.box, className)}
      style={[boxStyle, style]}
    >
      {look.wash && !explicit ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          className={cn("absolute inset-0", REGISTERS[register], look.wash)}
        />
      ) : null}
      <NativeText className={cn(LABEL[register], look.ink)} style={inkStyle}>
        {children}
      </NativeText>
    </View>
  );
}
