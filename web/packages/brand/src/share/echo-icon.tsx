import { createElement } from "react";

import { echoIconGeometry } from "../echo";
import { ICONS } from "../icons";

/** A registry icon (a Lucide name from `ICONS`) over its solid copy, in the element's own color. */
export function ShareEchoIcon({ name, size, color, dark = false }: { name: string; size: number; color: string; dark?: boolean }) {
  const node = ICONS[name];
  if (!node) return null;
  const g = echoIconGeometry(size, color, { dark });
  const glyph = (stroke: string, fill: string, strokeWidth: number) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size, flex: "none" }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${g.dx}px, ${g.dy}px) rotate(${g.angle}deg)`,
        }}
      >
        {glyph(g.copy, g.copy, g.copyLine)}
      </div>
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0 }}>{glyph(g.ink, "none", g.inkLine)}</div>
    </div>
  );
}
