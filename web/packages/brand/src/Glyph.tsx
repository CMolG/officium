import { createElement } from "react";
import { Ampersand, BookOpenText, CodeXml, House, LayoutGrid, type IconNode } from "lucide";

/**
 * The glyphs `@javadaba/ui` draws as affordance: the ecosystem links in the Javadaba menu.
 *
 * Here and not in `@javadaba/ui` because this package is the one that already carries lucide's
 * icon DATA (`lucide`, not `lucide-react`): `ui` depends on `brand` and nothing else, and a
 * second icon dependency in the base package is the laziness algorithm's last resort. Drawn the
 * way `JavadabaLogo` draws its seal glyphs, so it is a plain server-safe SVG — no "use client",
 * which is what broke every favicon when `Icon` came from `lucide-react`.
 *
 * A closed map, not "any lucide name": each entry is a glyph some piece actually paints.
 */
const GLYPHS = {
  house: House,
  "layout-grid": LayoutGrid,
  "book-open-text": BookOpenText,
  "code-xml": CodeXml,
  ampersand: Ampersand,
} satisfies Record<string, IconNode>;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({
  name,
  size = 20,
  strokeWidth = 2,
  className,
}: {
  name: GlyphName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {GLYPHS[name].map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
