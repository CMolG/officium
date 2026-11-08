/**
 * Where an anchored layer (Popover, Select) sits on a phone (JAVA-1486), in window coordinates:
 * under its anchor, flipped above when it does not fit below and there is more room above, and
 * kept `padding` inside the window's sides. The web Select's rule, shared by both twins and a test.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Placement {
  top: number;
  left: number;
  above: boolean;
  /** The room the layer has on the side it took; a taller layer scrolls inside it. */
  maxHeight: number;
}

/** How far a layer stays from the window's sides, and from the system bars. */
export const EDGE_PADDING = 8;

export function placeAnchored(
  anchor: Box,
  size: { width: number; height: number },
  win: { width: number; height: number },
  {
    gap = 6,
    padding = EDGE_PADDING,
    align = "start",
    insets = { top: 0, bottom: 0 },
  }: {
    gap?: number;
    padding?: number;
    align?: "start" | "center" | "end";
    /** The system bars' heights: the window is edge to edge, and SystemUI owns the touches under them. */
    insets?: { top: number; bottom: number };
  } = {},
): Placement {
  const below = win.height - insets.bottom - (anchor.y + anchor.height) - gap - padding;
  const above = anchor.y - insets.top - gap - padding;
  const flip = size.height > below && above > below;
  const room = Math.max(0, flip ? above : below);
  const height = Math.min(size.height, room);
  const top = flip ? anchor.y - gap - height : anchor.y + anchor.height + gap;
  const wanted = align === "end" ? anchor.x + anchor.width - size.width : align === "center" ? anchor.x + (anchor.width - size.width) / 2 : anchor.x;
  const left = Math.max(padding, Math.min(wanted, win.width - size.width - padding));
  return { top, left, above: flip, maxHeight: room };
}
