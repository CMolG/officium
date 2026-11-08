"use client";

import type { TheaterPartProps } from "../types";
import { cx } from "../constants";
import { useTheater } from "../hooks/useTheater";

export interface TheaterCaptionProps extends TheaterPartProps {
  /** Shown on the bar. Off, it is still read to screen readers, never painted. */
  visible?: boolean;
}

export function TheaterCaption({
  visible = false,
  className,
  style,
  children,
}: TheaterCaptionProps) {
  const { scene, index } = useTheater();
  const content = children ?? scene?.caption ?? scene?.title ?? null;

  // Keyed by SCENE, not by pass: the same scene starting over is not a new caption, and
  // repeating its entrance on every lap was one more flicker at the end.
  return (
    <p
      className={cx(visible ? "theater__caption" : "theater__sr", className)}
      style={style}
      aria-live="polite"
    >
      <span key={index} className="theater__caption-text">
        {content}
      </span>
    </p>
  );
}
