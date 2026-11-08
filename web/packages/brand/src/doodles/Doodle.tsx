import type { CSSProperties } from "react";
import { DOODLES, type DoodleName } from "./catalog";
import { doodleAspect, doodleUrl } from "./url";

/*
 * Sizes, from Content pages 4.07: 64 px beside a heading, 72 to 110 in a state card, 120 to 150
 * for a whole-page state, up to 220 in a website aside. A number is also fine; the vacation scene
 * is capped at 240 whatever is asked.
 */
export const DOODLE_SIZES = { heading: 64, card: 96, page: 136, aside: 220 } as const;
export type DoodleSize = keyof typeof DOODLE_SIZES | number;

/**
 * The drawings are black ink on TRANSPARENCY (the owner's masters, exported with alpha: wave 7,
 * MIG-A03), so they sit on a photograph, a stone card or the page itself exactly as the design shows
 * them, with no blend. On a dark surface the ink is inverted to white. `auto` follows the nearest dark
 * surface (`data-jd-surface` showcase, pulse or desktop, or `.dark`); `dark` and `light` name the ink
 * and decide it.
 */
export type DoodleInk = "auto" | "dark" | "light";

// Hoisted by React 19 into <head> once however many drawings the page has: no stylesheet to import,
// no Tailwind `@source` to declare for this package.
const CSS = `
.jd-doodle{display:block;height:auto;max-width:100%;user-select:none}
.jd-doodle[data-ink="light"],.dark .jd-doodle[data-ink="auto"],[data-jd-surface="showcase"] .jd-doodle[data-ink="auto"],[data-jd-surface="pulse"] .jd-doodle[data-ink="auto"],[data-jd-surface="desktop"] .jd-doodle[data-ink="auto"]{filter:invert(1)}
`;

export type DoodleProps = {
  name: DoodleName;
  size?: DoodleSize;
  ink?: DoodleInk;
  /** The first screen's drawing: loads eagerly and first. Everything else is lazy. */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
} & (
  | {
      /**
       * Empty when the words beside the drawing already say it ("Only you see them" next to shh);
       * otherwise one short line that describes it. `DOODLES[name].alt` has one for each.
       */
      alt: string;
      decorative?: never;
    }
  | { decorative: true; alt?: never }
);

export function Doodle({ name, size = "card", ink = "auto", priority, className, style, alt, decorative }: DoodleProps) {
  const asked = typeof size === "number" ? size : DOODLE_SIZES[size];
  const width = Math.min(asked, DOODLES[name].maxSize ?? asked);
  return (
    <>
      <style href="jd-doodle" precedence="default">
        {CSS}
      </style>
      <img
        src={doodleUrl(name)}
        alt={decorative ? "" : alt}
        aria-hidden={decorative ? true : undefined}
        width={width}
        height={Math.round(width * doodleAspect(name))}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
        data-ink={ink}
        className={className ? `jd-doodle ${className}` : "jd-doodle"}
        style={style}
      />
    </>
  );
}
