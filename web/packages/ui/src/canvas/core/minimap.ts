// packages/ui/src/canvas/core/minimap.ts
//
// The minimap's geometry as pure functions (Lib-Canvas "HUD"): everything on the field, shrunk into a
// small box, with the window the person is looking through drawn on it. Click a place and the
// field centers there.

import type { CameraState, Point, Rect, Size } from './types';

export interface MinimapLayout {
  /** Box pixels per world unit. */
  scale: number;
  /** Where the world's top-left lands in the box. */
  offset: Point;
  /** Every item's rectangle, in box pixels. */
  items: Array<{ id: string; rect: Rect }>;
  /** The visible window, in box pixels. */
  view: Rect;
}

/** The world rectangle the camera shows in a viewport of `viewport` screen pixels. */
export function visibleWorld(camera: CameraState, viewport: Size): Rect {
  return {
    x: -camera.pan.x / camera.zoom,
    y: -camera.pan.y / camera.zoom,
    width: viewport.width / camera.zoom,
    height: viewport.height / camera.zoom,
  };
}

function union(rects: readonly Rect[]): Rect {
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Fits the items and the visible window into `box`, keeping their proportions and centering the
 * whole, with `padding` pixels of air. Nothing is clipped: the window may sit beyond the items.
 */
export function minimapLayout(
  items: ReadonlyArray<{ id: string; rect: Rect }>,
  view: Rect,
  box: Size,
  padding = 8,
): MinimapLayout {
  const bounds = union([view, ...items.map((item) => item.rect)]);
  const room = { width: Math.max(1, box.width - 2 * padding), height: Math.max(1, box.height - 2 * padding) };
  const scale = Math.min(room.width / Math.max(1, bounds.width), room.height / Math.max(1, bounds.height));
  const offset = {
    x: padding + (room.width - bounds.width * scale) / 2 - bounds.x * scale,
    y: padding + (room.height - bounds.height * scale) / 2 - bounds.y * scale,
  };
  const place = (r: Rect): Rect => ({
    x: r.x * scale + offset.x,
    y: r.y * scale + offset.y,
    width: r.width * scale,
    height: r.height * scale,
  });
  return { scale, offset, items: items.map((item) => ({ id: item.id, rect: place(item.rect) })), view: place(view) };
}

/** The world point under a point of the box: what a click on the minimap asks to center on. */
export function minimapToWorld(point: Point, layout: Pick<MinimapLayout, 'scale' | 'offset'>): Point {
  return { x: (point.x - layout.offset.x) / layout.scale, y: (point.y - layout.offset.y) / layout.scale };
}
