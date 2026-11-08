// packages/ui/src/canvas/core/camera.ts
//
// World<->screen camera as pure functions. Canonical formula ported from
// Fluxor's pattern (`SeamlessCanvas.tsx:362-363`: `(client - rect - pan) / zoom`,
// repeated at 273-274 and 407-408) and from `centerViewportOn`
// (`NodeTree.tsx:165-176`).

import type { CameraState, Insets, Point, Rect, Size, ZoomBounds } from './types';
import { DEFAULT_ZOOM_BOUNDS } from './types';

// NOTE: CameraState/ZoomBounds/DEFAULT_ZOOM_BOUNDS live in ./types and
// are re-exported from there by the public barrel (src/index.ts) — they
// are not re-exported here again to avoid a "multiple exports with the
// same name" clash.

/**
 * Converts a screen point (client/DOM coordinates) to world space.
 * `viewportOrigin` is the canvas's top-left corner in client coordinates
 * (normally `element.getBoundingClientRect()`).
 */
export function screenToWorld(screen: Point, camera: CameraState, viewportOrigin: Point): Point {
  return {
    x: (screen.x - viewportOrigin.x - camera.pan.x) / camera.zoom,
    y: (screen.y - viewportOrigin.y - camera.pan.y) / camera.zoom,
  };
}

/** Inversa de {@link screenToWorld}. */
export function worldToScreen(world: Point, camera: CameraState, viewportOrigin: Point): Point {
  return {
    x: world.x * camera.zoom + camera.pan.x + viewportOrigin.x,
    y: world.y * camera.zoom + camera.pan.y + viewportOrigin.y,
  };
}

export function clampZoom(zoom: number, bounds: ZoomBounds = DEFAULT_ZOOM_BOUNDS): number {
  return Math.min(bounds.max, Math.max(bounds.min, zoom));
}

/**
 * Applies `deltaZoom` (additive) to `camera.zoom`, clamped to `bounds`,
 * and adjusts `pan` so the world point under `screenAnchor` stays
 * anchored (zoom centered on the cursor).
 *
 * Contract gotcha: unlike `screenToWorld`/`worldToScreen`, this function
 * does NOT take `viewportOrigin`. `screenAnchor` must already be in the
 * same local frame as `pan` (e.g. `event.clientX - rect.left`, not the
 * raw `event.clientX`) — the origin term cancels out algebraically in
 * the anchored-zoom formula as long as the origin does not change during
 * the gesture, which is the case for a zoom wheel/pinch.
 */
export function zoomAt(
  camera: CameraState,
  screenAnchor: Point,
  deltaZoom: number,
  bounds: ZoomBounds = DEFAULT_ZOOM_BOUNDS,
): CameraState {
  const newZoom = clampZoom(camera.zoom + deltaZoom, bounds);
  if (newZoom === camera.zoom) return camera;
  const scale = newZoom / camera.zoom;
  return {
    zoom: newZoom,
    pan: {
      x: screenAnchor.x + (camera.pan.x - screenAnchor.x) * scale,
      y: screenAnchor.y + (camera.pan.y - screenAnchor.y) * scale,
    },
  };
}

/**
 * Generalization of `centerViewportOn` (Fluxor `NodeTree.tsx:165-176`):
 * the `-280`/`-60` offsets hardcoded there (left panel width, top bar
 * height) become `insets` the consumer decides. Returns the `pan` that
 * centers `rect` (world space) in the `viewport`'s visible area (screen
 * size) once the `insets` are subtracted, at the given `zoom`.
 */
export function centerOn(rect: Rect, viewport: Size, zoom: number, insets: Insets = {}): Point {
  const left = insets.left ?? 0;
  const right = insets.right ?? 0;
  const top = insets.top ?? 0;
  const bottom = insets.bottom ?? 0;

  const visibleWidth = viewport.width - left - right;
  const visibleHeight = viewport.height - top - bottom;
  const visibleCenter: Point = {
    x: left + visibleWidth / 2,
    y: top + visibleHeight / 2,
  };

  const worldCenter: Point = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };

  return {
    x: visibleCenter.x - worldCenter.x * zoom,
    y: visibleCenter.y - worldCenter.y * zoom,
  };
}
