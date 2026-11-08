/** What `Skeleton` takes on both runtimes. A bone is sized by its caller, never by a default: a generic size is the layout shift. */

export type SkeletonShape = "line" | "block" | "circle";

export interface SkeletonAxes {
  /** Picks the corner radius only; the size comes from the caller's `className`, or `h-3 w-full` for a line. */
  shape?: SkeletonShape;
  /** The bone's breath: a slow opacity pulse, 1.6 s, on by default and still under reduced motion. `false` keeps it flat. */
  pulse?: boolean;
  className?: string;
}

export const SKELETON_RADIUS: Record<SkeletonShape, string> = {
  line: "rounded-md",
  block: "rounded-[var(--radius-jd-md)]",
  circle: "rounded-[var(--radius-jd-pill)]",
};
