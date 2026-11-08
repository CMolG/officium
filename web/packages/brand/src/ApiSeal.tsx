import { createElement } from "react";
import { CANVAS, CANVAS_RADIUS } from "./constants";
import { ICONS } from "./icons";
import { DEFAULT_NOISE, Gradient, NoiseDefs, NoiseRect } from "./parts";
import type { BrandEntry } from "./registry";

/*
 * The API seal in the new language (Brand 11, "Twenty-two circles"): a frosted circle over the
 * family's three stops. The box is the family's gradient on the diagonal, the circle is white at
 * 60% with a soft shadow and a lit top-left edge, and the glyph is plain ink. The family colors
 * and the glyph still come from the registry, untouched: only the drawing around them changed.
 */

const BOX_ANGLE = 45; // Figma: top-left to bottom-right, like the design's 135deg
const CIRCLE_R = 279; // 84 of 128 in the design
const GLYPH = 266; // 40 of 128

export function ApiSeal({ id, entry, grain }: { id: string; entry: BrandEntry; grain: boolean }) {
  const g = entry.gradient;
  const node = entry.icon ? ICONS[entry.icon] : undefined;
  const c = CANVAS / 2;
  return (
    <>
      <defs>
        {g && <Gradient id={`${id}-box`} g={{ ...g, angle: BOX_ANGLE }} />}
        <clipPath id={`${id}-clip`}>
          <rect width={CANVAS} height={CANVAS} rx={CANVAS_RADIUS} />
        </clipPath>
        <filter id={`${id}-lift`} x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="14" />
          <feOffset dy="8" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".18" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {grain && <NoiseDefs filterId={`${id}-noisef`} maskId={`${id}-noisem`} noise={DEFAULT_NOISE} />}
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width={CANVAS} height={CANVAS} fill={g ? `url(#${id}-box)` : "#000000"} />
        {grain && <NoiseRect maskId={`${id}-noisem`} noise={DEFAULT_NOISE} />}
      </g>
      <circle cx={c} cy={c} r={CIRCLE_R} fill="#FFFFFF" fillOpacity={0.6} filter={`url(#${id}-lift)`} />
      <circle cx={c} cy={c} r={CIRCLE_R - 4} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={8} />
      {node && (
        <g transform={`translate(${c - GLYPH / 2} ${c - GLYPH / 2}) scale(${GLYPH / 24})`} color="#111111">
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
          </svg>
        </g>
      )}
    </>
  );
}
