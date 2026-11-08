import { cn } from "../lib/cn";
import { SKELETON_RADIUS, type SkeletonAxes } from "./skeleton.shared";

/*
 * Skeleton: one bone of a loading stand-in (JAVA-1576, Lib-Display `.bone`). It is decoration, always
 * `aria-hidden`: the `LoadingRegion` around it speaks for the whole region. Its colour is the surface's
 * bone token, so it reads on every surface without a hand-written alpha, and it breathes (opacity,
 * 1.6 s) unless the person asked for less motion. Born in the subset Yoga can draw.
 */

export interface SkeletonProps extends SkeletonAxes {}

export function Skeleton({ shape = "line", pulse = true, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block bg-[color:var(--jd-bone)]",
        SKELETON_RADIUS[shape],
        shape === "line" && "h-3 w-full",
        pulse && "motion-safe:animate-jd-bone",
        className,
      )}
    />
  );
}
