// packages/ui/src/canvas/core/types.ts
// Primitives shared by every layer of the engine (core/react/chrome).
// Extended in later tasks (camera, selection, z-order, hud-grid...).

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Screen-pixel insets, all optional (0 if omitted). Generalizes the hardcoded
 * `-280`/`-60` offsets of Fluxor's `centerViewportOn` in
 * `NodeTree.tsx:165-176`: the consumer decides how much of its own layout
 * (fixed panels) has to be subtracted when centering the camera on an item.
 */
export interface Insets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface CellSpec {
  width: number;
  height: number;
  gap: number;
}

/**
 * Spec for the fine quantization/packing grid. Generalizes the
 * `FINE_CELL`/`GRID_PADDING`/`TOP_BAR_HEIGHT` constants from
 * `javadaba-web-os/lib/desktopGrid.ts` (see `core/grid.ts` for the port).
 */
export interface GridSpec {
  cell: CellSpec;
  padding: { x: number; y: number };
  /**
   * Effective origin of row 0, in pixels. web-os uses
   * `max(padding.y, topBarHeight + 16)` = 48 with its default values; that
   * result is captured directly instead of reintroducing a "top bar"
   * constant the engine has no notion of.
   */
  originY?: number;
}

/** Default values = the ones from `javadaba-web-os/lib/desktopGrid.ts`. */
export const DEFAULT_GRID_SPEC: GridSpec = {
  cell: { width: 131, height: 101, gap: 18 },
  padding: { x: 24, y: 44 },
  originY: 48,
};

export type GuideOrientation = 'vertical' | 'horizontal';

/**
 * An alignment guide (Figma/Fluxor-style "smart guide"): a line at `position`
 * on the axis perpendicular to `orientation` (x for vertical, y for
 * horizontal), bounded between `from` and `to` along its own axis.
 */
export interface SnapGuide {
  orientation: GuideOrientation;
  position: number;
  from: number;
  to: number;
}

/** Minimal camera state: pan offset + zoom factor. */
export interface CameraState {
  pan: Point;
  zoom: number;
}

export interface ZoomBounds {
  min: number;
  max: number;
}

/** Fluxor desktop-store.ts:1544 — [0.25, 3] clamp shared by the engine. */
export const DEFAULT_ZOOM_BOUNDS: ZoomBounds = { min: 0.25, max: 3 };
