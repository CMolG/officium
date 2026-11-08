import type { CSSProperties } from "react";
import { ACCENT_DESK } from "../constants";

/**
 * Six circles, sized and placed as the Javadaba desktop's. Percentages of the desk, so the same
 * arrangement holds at 1120 px and at 358.
 */
const CIRCLES = [
  { size: 67, left: -7, top: -19, color: 0 },
  { size: 61, left: 54, top: -30, color: 1 },
  { size: 42.5, left: 82, top: 10, color: 2 },
  { size: 36, left: 7, top: 27, color: 3 },
  { size: 15.5, left: -7, top: 15, color: 3 },
  { size: 10.7, left: 24, top: 15, color: 2 },
] as const;

/** A product color, lightened toward white so the desk stays a quiet floor under the window. */
const soften = (color: string) => `color-mix(in srgb, ${color} 38%, #fff)`;

export interface TheaterDeskProps {
  /** The product's colors (two to four); cycled over the six circles. Default: the surrounding Surface's accent. */
  palette?: readonly string[];
}

/** The desk behind the window: the product's colors as blurred circles, then a veil that keeps the glass legible. */
export function TheaterDesk({ palette }: TheaterDeskProps) {
  const colors = (palette?.length ? palette : ACCENT_DESK).map(soften);
  return (
    <>
      <span className="theater__desk" aria-hidden="true">
        {CIRCLES.map((c, i) => (
          <i
            key={i}
            style={
              {
                width: `${c.size}%`,
                left: `${c.left}%`,
                top: `${c.top}%`,
                background: colors[c.color % colors.length],
              } as CSSProperties
            }
          />
        ))}
      </span>
      <span className="theater__veil" aria-hidden="true" />
    </>
  );
}
