import type { ComponentType, CSSProperties } from "react";
import { ECHO, echoIconGeometry } from "@javadaba/brand";

import { cn } from "../lib/cn";

/*
 * EchoIcon, Library 17 "Echo": an icon over a solid copy of itself in the element's own color,
 * offset and turned 5 degrees behind it (`web.echo_icon`). Gymnasium's food, the awards, a product's
 * feature icons and an empty list's one icon wear it.
 *
 * The numbers (10% and 8% offset, a copy line 1.6 heavier, ink 2.2 under 32 px) come from
 * `echoIconGeometry` in `@javadaba/brand`, so the share cards and the tool mark agree with this
 * piece. Rules the design states and this piece cannot check for you: the color is the element's
 * own, never chosen for decoration; one echo per element; never on text, tables or charts; never
 * under 20 px (below it the plain icon is used, so `size` is raised to 20).
 *
 * The copy is decoration: the wrapper is `aria-hidden`, the label beside it says what it is. It
 * stays still unless `turn` is set, and then it turns 3 degrees more only while a link or button
 * around it is hovered; under reduced motion it jumps without animating.
 */

/** Any icon component that draws a Lucide-style SVG: `lucide-react`'s icons fit. */
export type EchoGlyph = ComponentType<{
  size?: number | string;
  color?: string;
  fill?: string;
  strokeWidth?: number | string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface EchoIconProps {
  icon: EchoGlyph;
  /** In pixels. 20 to 128; smaller is raised to 20. */
  size?: number;
  /** The element's own color: a food's family, a product's accent (`echoAccent(slug)`). */
  color: string;
  /** The ink icon's line in Lucide's 24-unit space. */
  line?: number;
  /** On a dark ground: white ink, the copy 62% of the color. */
  dark?: boolean;
  /** A darker shade of the color for the ink, instead of `#262626`. */
  ink?: string;
  /** Turn 3 degrees more while a link or button around it is hovered. */
  turn?: boolean;
  className?: string;
  style?: CSSProperties;
}

const FILL = "absolute inset-0 flex flex-row items-center justify-center";
// Rest and turned angles are custom properties, and the hover rule only swaps which one the
// transform reads: an inline `--echo-angle` would beat the class, so it is never set inline.
const TURN =
  "transition-transform duration-200 ease-out motion-reduce:transition-none [:is(a,button):hover_&]:[--echo-angle:var(--echo-turned)]";

export function EchoIcon({
  icon: Icon,
  size = 40,
  color,
  line,
  dark = false,
  ink,
  turn = false,
  className,
  style,
}: EchoIconProps) {
  const px = Math.max(size, ECHO.minIconSize);
  const g = echoIconGeometry(px, color, { line, dark, ink });
  const copy = {
    color: g.copy,
    transform: `translate(${g.dx}px, ${g.dy}px) rotate(var(--echo-angle))`,
    "--echo-rest": `${g.angle}deg`,
    "--echo-turned": `${g.angle + ECHO.turn}deg`,
  } as CSSProperties;
  return (
    <span
      aria-hidden="true"
      data-jd-component="EchoIcon"
      className={cn("relative inline-flex shrink-0 flex-row items-center justify-center", className)}
      style={{ width: px, height: px, ...style }}
    >
      <span className={cn(FILL, "[--echo-angle:var(--echo-rest)]", turn && TURN)} style={copy}>
        <Icon size={px} fill="currentColor" color="currentColor" strokeWidth={g.copyLine} aria-hidden="true" />
      </span>
      <span className={cn(FILL, "z-[1]")} style={{ color: g.ink }}>
        <Icon size={px} fill="none" color="currentColor" strokeWidth={g.inkLine} aria-hidden="true" />
      </span>
    </span>
  );
}
