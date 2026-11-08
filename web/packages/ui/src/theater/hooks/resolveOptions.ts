import type { TheaterRootProps } from "../types";

/**
 * The Root's options with their defaults applied, in one place: two hooks read them, and a
 * default written twice is how `pauseOnHover` ended up `false` in one and `true` in the other.
 */
export function resolveOptions({
  loop = true,
  maxLoops = Infinity,
  duration = 4000,
  transition = 400,
  pauseOnHover = false,
  pauseOnInteract = false,
  pauseOffscreen = true,
  resumeOnLeave = false,
}: TheaterRootProps) {
  return {
    loop,
    maxLoops,
    duration,
    transition,
    pauseOnHover,
    pauseOnInteract,
    pauseOffscreen,
    resumeOnLeave,
  };
}
