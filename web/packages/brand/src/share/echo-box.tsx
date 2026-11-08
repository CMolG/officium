import type { ReactNode } from "react";

import { echoShapeGeometry } from "../echo";

/* Echo (Library 17) for Satori: the DOM pieces in `@javadaba/ui` read a stylesheet, a card cannot. */

/** Evenly spaced centers along one edge, `3 * hole` apart or a little more, never at a corner. */
function holesAlong(length: number, hole: number): number[] {
  const count = Math.max(1, Math.round(length / (3 * hole)));
  return Array.from({ length: count }, (_, i) => ((i + 0.5) * length) / count);
}

/**
 * A stamp's copy: the box in `color` with round holes along its four edges (Cibus Iter's dishes).
 * Satori draws no `radial-gradient` ring the way the DOM does, so the copy is an image: a plain SVG
 * (a mask, no ids elsewhere, no filters) serialized as a data URI, which the card renderer rasterizes.
 */
export function perforatedCopyUri(color: string, width: number, height: number, hole: number): string {
  const circle = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="${hole}" fill="#000"/>`;
  const holes = [
    ...holesAlong(width, hole).flatMap((x) => [circle(x, 0), circle(x, height)]),
    ...holesAlong(height, hole).flatMap((y) => [circle(0, y), circle(width, y)]),
  ].join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<mask id="p"><rect width="${width}" height="${height}" fill="#fff"/>${holes}</mask>` +
    `<rect width="${width}" height="${height}" fill="${color}" mask="url(#p)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * A box over a copy of itself in `color`: offset 3.5% and 3% of the width, turned 4 degrees. With
 * `perf` (a hole radius in pixels) the copy is perforated like a stamp, as `EchoShape` does in the DOM.
 */
export function ShareEchoBox({
  color,
  width,
  height,
  radius,
  perf,
  children,
}: {
  color: string;
  width: number;
  height: number;
  radius: number;
  /** A stamp's hole radius in pixels: the copy gets round holes along its edge and no rounded corners. */
  perf?: number;
  children: ReactNode;
}) {
  const g = echoShapeGeometry(width);
  const place = {
    display: "flex",
    position: "absolute",
    left: 0,
    top: 0,
    width,
    height,
    transform: `translate(${g.dx}px, ${g.dy}px) rotate(${g.angle}deg)`,
  } as const;
  return (
    <div style={{ display: "flex", position: "relative", width, height, flex: "none" }}>
      {perf ? (
        <img src={perforatedCopyUri(color, width, height, perf)} width={width} height={height} alt="" style={place} />
      ) : (
        <div style={{ ...place, borderRadius: radius, background: color }} />
      )}
      <div style={{ display: "flex", position: "relative", width, height, borderRadius: radius }}>{children}</div>
    </div>
  );
}
