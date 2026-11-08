import type { ReactNode } from "react";

import { cn } from "../lib/cn";

/*
 * DoodleArt -- the stage a doodle stands on (Lib-Chrome): a soft halo in the product's accent behind
 * the drawing, and three small shapes (a diamond, a dot, a ring) that drift a few pixels and back at
 * their own pace. The drawing itself is `<Doodle>` from `@javadaba/brand/doodles`, passed as
 * children, so the ink follows the surface (dark ink on light, white on a dark island). In low mode,
 * and for anyone who asks for less motion or pauses animations, the drawing stays and the drift stops.
 */

export interface DoodleArtProps {
  children: ReactNode;
  /** The stage's height in px. */
  height?: number;
  /** Draws the accent halo. On by default. */
  halo?: boolean;
  /** Draws the three drifting shapes. On by default. */
  shapes?: boolean;
  /** Fills the stage with the page ink (a dark tile), so the doodle shows in its light ink. */
  inverted?: boolean;
  className?: string;
}

// Each shape keeps its own corner, size and drift length so the three never move together.
const SHAPES = [
  { className: "left-[14%] top-[18%] size-3 rotate-45 rounded-[2px] bg-[color:var(--jd-accent)]", duration: "7s", delay: "0s" },
  { className: "right-[16%] top-[30%] size-2 rounded-full bg-[color:var(--jd-ink)] opacity-60", duration: "11s", delay: "-3s" },
  { className: "bottom-[16%] right-[26%] size-4 rounded-full border-2 border-[color:var(--jd-accent)]", duration: "9s", delay: "-6s" },
] as const;

const STILL = "motion-reduce:animate-none [[data-capability=low]_&]:animate-none [[data-jd-animations=paused]_&]:animate-none";

export function DoodleArt({
  children,
  height = 180,
  halo = true,
  shapes = true,
  inverted = false,
  className,
}: DoodleArtProps) {
  return (
    <div
      data-jd-component="DoodleArt"
      className={cn(
        "relative flex flex-row items-center justify-center overflow-hidden rounded-2xl",
        inverted
          ? "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]"
          : "bg-[color:var(--jd-raised)] shadow-[inset_0_0_0_1px_var(--jd-line)]",
        className,
      )}
      style={{ height }}
    >
      {halo && (
        <span
          aria-hidden="true"
          className={cn("absolute size-[120px] animate-jd-drift rounded-full", STILL)}
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--jd-accent) 45%, transparent), transparent 70%)" }}
        />
      )}
      {shapes &&
        SHAPES.map((shape) => (
          <span
            key={shape.className}
            aria-hidden="true"
            data-slot="doodle-shape"
            className={cn("absolute animate-jd-drift", shape.className, STILL)}
            style={{ animationDuration: shape.duration, animationDelay: shape.delay }}
          />
        ))}
      <div className="relative flex flex-row">{children}</div>
    </div>
  );
}
