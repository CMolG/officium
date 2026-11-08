import { createElement } from "react";
import { ICONS } from "../icons";

/** lucide glyph inside the SVG, scaled.
 *  `color` feeds lucide's stroke `currentColor`: black on the glass pane, white over the
 *  black diamond (spinner/rethink). `filterId` is its inner shadow. */
export function Glyph({
  name,
  filterId,
  size,
  pos,
  strokeWidth,
  color = "#000000",
}: {
  name: string;
  filterId: string;
  size: number;
  pos: number;
  strokeWidth: number;
  color?: string;
}) {
  const node = ICONS[name];
  if (!node) return null;
  // lucide's own defaults (24 grid, round caps and joins, `currentColor` stroke), drawn from the
  // node the way lucide-react draws it -- so the glyph looks exactly as it did.
  return (
    <g
      filter={`url(#${filterId})`}
      transform={`translate(${pos} ${pos}) scale(${size / 24})`}
      color={color}
    >
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
      </svg>
    </g>
  );
}
