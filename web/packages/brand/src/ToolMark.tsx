import { createElement } from "react";
import { echoIconGeometry } from "./echo";
import { onWhite } from "./hex";
import { ICONS } from "./icons";
import { TOOLS, TOOL_CATEGORIES, type ToolCategory } from "./tools";

/*
 * The tool mark (Library 19): a disc in the category's tint with the category's icon. Drawn as one
 * inline SVG with no ids and no stylesheet, so it renders in any board or email and serializes into
 * a favicon (`favicon.tsx`) the way the product seals do.
 *
 * Six sizes, from the design: 16, 20 and 24 are a plain icon on the disc (62% of it, a 2.2 px line
 * up to 20 px, 2 px at 24); from 32 the icon is 50% of the disc and carries its Echo, the solid copy
 * in the category color, five degrees off (Library 17), measured by `echoIconGeometry` like every other
 * Echo. Under 32 the Echo would read as a smudge, so it is dropped. Any other size follows the nearest one.
 */

const INK = "#262626";
const SIZES = [
  { size: 16, line: 2.2 },
  { size: 20, line: 2.2 },
  { size: 24, line: 2 },
  { size: 32, line: 1.9 },
  { size: 40, line: 1.9 },
  { size: 56, line: 1.75 },
] as const;

function ruleFor(size: number) {
  return SIZES.reduce((a, b) => (Math.abs(b.size - size) < Math.abs(a.size - size) ? b : a));
}

export type ToolMarkProps = { size?: number; dark?: boolean; className?: string } & (
  | { category: ToolCategory; slug?: never }
  | { slug: string; category?: never }
);

export function ToolMark({ size = 24, dark = false, className, category, slug }: ToolMarkProps) {
  const cat = category ?? (slug ? TOOLS[slug]?.category : undefined);
  if (!cat) return null;
  const { icon, color } = TOOL_CATEGORIES[cat];
  const node = ICONS[icon];
  if (!node) return null;
  const rule = ruleFor(size);
  const echo = size >= 32;
  const glyph = size * (echo ? 0.5 : 0.62);
  const at = (size - glyph) / 2;
  const copy = echoIconGeometry(glyph, color, { line: rule.line, thin: false });
  const shapes = node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }));
  // On white the tint is the color at 22% with a 42% hairline; on a dark ground the disc keeps its
  // own light ground (34%) and gains a white hairline.
  const ground = onWhite(color, dark ? 0.34 : 0.22);
  const edge = dark ? "rgba(255,255,255,.18)" : onWhite(color, 0.42);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      data-cat={cat}
      className={className}
      style={{ display: "inline-block", flex: "none", verticalAlign: "middle", overflow: "hidden", borderRadius: "9999px" }}
    >
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={ground} />
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 0.5} fill="none" stroke={edge} strokeWidth={1} />
      {echo && (
        <g
          transform={`translate(${at + copy.dx} ${at + copy.dy}) rotate(${copy.angle} ${glyph / 2} ${glyph / 2}) scale(${glyph / 24})`}
          color={color}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={copy.copyLine}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {shapes}
        </g>
      )}
      <g
        transform={`translate(${at} ${at}) scale(${glyph / 24})`}
        color={INK}
        fill="none"
        stroke="currentColor"
        strokeWidth={rule.line}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {shapes}
      </g>
    </svg>
  );
}
