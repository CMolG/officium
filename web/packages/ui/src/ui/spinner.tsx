import { cn } from "../lib/cn";

/*
 * Spinner: the arc that turns beside a sentence saying what is happening (Lib-Controls § Busy,
 * Lib-Display § Waiting). Nothing spins without a sentence beside it, so it is decoration:
 * `aria-hidden`, and the words around it (or the button's busy label) are what assistive tech
 * reads. It only turns for people who have not asked for less motion; otherwise it is a still arc.
 */

export interface SpinnerProps {
  /** Pixel size of the square. Default 16, the size of a button's icon. */
  size?: number;
  className?: string;
}

export function Spinner({ size = 16, className }: SpinnerProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={cn("shrink-0 motion-safe:animate-spin", className)}
      data-jd-component="Spinner"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
