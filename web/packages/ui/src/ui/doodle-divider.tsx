import { cn } from "../lib/cn";

/*
 * DoodleDivider -- the hand-drawn line that closes a page or parts two of its sections (Lib-Chrome).
 * One wavy stroke in the ink, the width of its container, 28 px tall; the stroke keeps its weight
 * whatever the width. Decorative: it says nothing a heading does not.
 */
export function DoodleDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-jd-component="DoodleDivider"
      width="100%"
      height="28"
      viewBox="0 0 400 28"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className={cn("block text-[color:var(--jd-ink)]", className)}
    >
      <path vectorEffect="non-scaling-stroke" d="M2 16c40-10 70 8 110 0s60-12 96-2 70 8 96-2 60-6 94 4" />
    </svg>
  );
}
