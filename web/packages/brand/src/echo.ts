import { contrastRatio } from "./chroma";
import { darken } from "./hex";
import { stageSource } from "./seal-stage";

/*
 * echo.ts: the numbers behind Echo (Library 17). Echo is the shadow Gymnasium nutrition draws its
 * food with: a solid copy of an icon, or of a whole box, in the element's own color, offset and
 * turned a few degrees behind it. It is a core component in two variants:
 *
 *   icon   a Lucide icon over a filled copy of itself, 5 degrees, 10% and 8% of its size away
 *   shape  any box over a copy of itself, 4 degrees, 3.5% and 3% of its width away (never under 3 px)
 *
 * The geometry lives here, in pure functions, because three renderers draw it and must agree: the
 * DOM components in `@javadaba/ui` (`EchoIcon`, `EchoShape`), the tool mark (`ToolMark`) and the
 * share cards, which are drawn by Satori and cannot read a stylesheet.
 */

export const ECHO = {
  /** The icon's copy is turned this much, always clockwise. */
  iconAngle: 5,
  iconDx: 0.1,
  iconDy: 0.08,
  /** The copy's line is this much heavier than the ink line, so it reads as a solid. */
  solid: 1.6,
  shapeAngle: 4,
  shapeDx: 0.035,
  shapeDy: 0.03,
  /** A shape's hover turn, in degrees, only while a link or button around it is hovered. */
  turn: 3,
  /** Below this the copy is noise: use the plain icon. */
  minIconSize: 20,
  /** Below this the ink line thickens so it stays ahead of its copy. */
  thinIconSize: 32,
  thinInkLine: 2.2,
  /** A shape's offset is never under this many pixels. */
  minOffset: 3,
  /** Over this width the shape's angle drops toward `floorAngle`, by `slope` degrees a pixel. */
  wideFrom: 320,
  wideSlope: 0.01,
  floorAngle: 1,
  /** Ink on a light ground, and on a dark one. */
  ink: "#262626",
  inkOnDark: "#FFFFFF",
  /** The copy is the color mixed with black, this much of the color kept: light, then dark grounds. */
  copyKeep: 0.92,
  copyKeepOnDark: 0.62,
} as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface EchoIconGeometry {
  size: number;
  /** The copy's offset and turn. */
  dx: number;
  dy: number;
  angle: number;
  /** Stroke widths in the icon's 24-unit space. */
  inkLine: number;
  copyLine: number;
  ink: string;
  copy: string;
}

export interface EchoIconOptions {
  /** The icon's own line in 24-unit space. Lucide's is 2. */
  line?: number;
  dark?: boolean;
  /** Overrides the ink (a darker shade of the color on a light ground). */
  ink?: string;
  /**
   * Thickens the ink line under 32 px (the default), so it stays ahead of its copy. A mark that
   * sets its own line per size (the tool marks) turns it off and keeps the line it was given.
   */
  thin?: boolean;
}

/** What `echo_icon(name, size, color, ink)` draws. */
export function echoIconGeometry(size: number, color: string, options: EchoIconOptions = {}): EchoIconGeometry {
  const { line = 2, dark = false, ink, thin = true } = options;
  const inkLine = thin && size < ECHO.thinIconSize ? Math.max(line, ECHO.thinInkLine) : line;
  return {
    size,
    dx: round1(size * ECHO.iconDx),
    dy: round1(size * ECHO.iconDy),
    angle: ECHO.iconAngle,
    inkLine,
    copyLine: round1(inkLine + ECHO.solid),
    ink: ink ?? (dark ? ECHO.inkOnDark : ECHO.ink),
    copy: darken(color, 1 - (dark ? ECHO.copyKeepOnDark : ECHO.copyKeep)),
  };
}

export interface EchoShapeGeometry {
  dx: number;
  dy: number;
  /** At rest, and while a link or button around the shape is hovered. */
  angle: number;
  hoverAngle: number;
}

/** What `echo_shape(inner, color, w, ...)` draws, for a box `width` pixels wide. */
export function echoShapeGeometry(width: number): EchoShapeGeometry {
  const wide = Math.max(0, width - ECHO.wideFrom) * ECHO.wideSlope;
  const angle = Math.max(ECHO.floorAngle, round1(ECHO.shapeAngle - wide));
  return {
    dx: Math.max(ECHO.minOffset, round1(width * ECHO.shapeDx)),
    dy: Math.max(ECHO.minOffset, round1(width * ECHO.shapeDy)),
    angle,
    hoverAngle: angle + ECHO.turn,
  };
}

/** The accent must still show on a light ground (a pale fill would vanish into the page). */
const SHOWS_ON_LIGHT = 1.25;
const INK_FLOOR = 3;

/**
 * `echo_accent(slug)`: a product's echo color, the first color of its seal palette that keeps the
 * ink at 3:1 and still shows on a light ground. One rule for every product, no hand-picked colors.
 * Undefined when the slug has no palette.
 */
export function echoAccent(slug: string): string | undefined {
  const palette = stageSource(slug);
  return palette.find(
    (color) => contrastRatio(ECHO.ink, color) >= INK_FLOOR && contrastRatio("#FFFFFF", color) >= SHOWS_ON_LIGHT,
  );
}
