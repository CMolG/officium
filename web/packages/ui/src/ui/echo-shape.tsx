import type { CSSProperties, ReactNode } from "react";
import { echoShapeGeometry } from "@javadaba/brand";

import { cn } from "../lib/cn";

/*
 * EchoShape, Library 17 "Echo": the same shadow for a whole object (`web.echo_shape`). A card, a
 * chip, an avatar, a book cover, a photo or a stamp sits over a copy of its own box in the
 * element's own color, offset 3.5% and 3% of its width (never under 3 px) and turned 4 degrees.
 *
 * `radius` goes on the wrapper and the copy inherits it, so a pill keeps its pill and a circle
 * copies a circle; the child must carry the same radius. `width` (pixels, when the box is a fixed
 * size) gives the exact offset and the wide-shape angle (over 320 px it drops toward 1 degree);
 * without it the offset is read from the box itself in percent, and the angle is 4.
 * `perf` is a stamp's hole radius: the copy is perforated like the stamp, the way Cibus Iter draws
 * its dishes.
 *
 * It moves only as a cue on something you can open: the copy turns 3 degrees more, in 200 ms, only
 * while an `a` or `button` around it is hovered. A card you cannot open never moves, and under
 * reduced motion the turn jumps without animating. Never on text, tables, charts, form fields or
 * anything that must align to a grid; never an echo inside an echo.
 */

export interface EchoShapeProps {
  /** The element's own color. */
  color: string;
  /** The box's width in pixels, when it has a fixed one. */
  width?: number;
  /** Wrapper radius, copied by the echo: a number is pixels. */
  radius?: number | string;
  /** A stamp's hole radius in pixels: the copy is perforated. */
  perf?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// The hover rule swaps which custom property the transform reads (an inline `--echo-angle` would
// beat the class), so rest and turned are set inline and `--echo-angle` only by the classes.
const BACK =
  "pointer-events-none absolute inset-0 -z-10 transition-transform duration-200 ease-out motion-reduce:transition-none [--echo-angle:var(--echo-rest)] [transform:translate(var(--echo-dx),var(--echo-dy))_rotate(var(--echo-angle))] [:is(a,button):hover_&]:[--echo-angle:var(--echo-turned)]";

/** A stamp's copy: round holes along the edge, solid inside (Cibus Iter's dishes). */
function perforated(color: string, hole: number): string {
  return (
    `radial-gradient(${hole}px, #0000 96%, ${color}) round ${-1.5 * hole}px ${-1.5 * hole}px / ${3 * hole}px ${3 * hole}px, ` +
    `linear-gradient(${color} 0 0) no-repeat 50% / calc(100% - ${3 * hole}px) calc(100% - ${3 * hole}px)`
  );
}

function offsets(width: number | undefined) {
  if (width === undefined) {
    return { dx: "max(3px, 3.5%)", dy: "max(3px, 3%)", angle: 4, turned: 7 };
  }
  const g = echoShapeGeometry(width);
  return { dx: `${g.dx}px`, dy: `${g.dy}px`, angle: g.angle, turned: g.hoverAngle };
}

export function EchoShape({ color, width, radius, perf, children, className, style }: EchoShapeProps) {
  const o = offsets(width);
  const back = {
    "--echo-dx": o.dx,
    "--echo-dy": o.dy,
    "--echo-rest": `${o.angle}deg`,
    "--echo-turned": `${o.turned}deg`,
    ...(perf ? { background: perforated(color, perf), borderRadius: 0 } : { background: color, borderRadius: "inherit" }),
  } as unknown as CSSProperties;
  return (
    <span
      data-jd-component="EchoShape"
      className={cn("relative isolate inline-block shrink-0 align-top", className)}
      style={{ borderRadius: radius, ...style }}
    >
      <span aria-hidden="true" className={BACK} style={back} />
      {children}
    </span>
  );
}
