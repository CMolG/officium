// packages/ui/src/canvas/core/snap.ts
//
// UNIFIED snap layer with a toggle — the piece that does not exist in
// any source (neither web-os nor Fluxor has a snap-to-grid switch;
// Fluxor only has alignment guides that are always on). Delegates guide
// detection to `./snap-guides` (a dedicated port of Fluxor's
// `calculateSnapGuides`) and quantization to `./grid` (a port of
// web-os's `desktopGrid.ts`).

import type { GridSpec, Point, Rect, SnapGuide } from './types';
import { colRowToPixels, pixelsToColRow } from './grid';
import { calculateSnapGuides } from './snap-guides';

export interface SnapConfig {
  /** Cuantizacion a rejilla (matematica portada de web-os). */
  grid: { enabled: boolean; spec: GridSpec };
  /** Edge+center alignment guides against other items (Fluxor's pattern). */
  guides: { enabled: boolean; threshold: number };
}

export interface SnapResult {
  pos: Point;
  guides: SnapGuide[];
}

/**
 * Resolves `rect`'s final position during a drag.
 *
 * Priority: if `guides.enabled` and there is an alignment candidate
 * within the threshold, the guide wins (partial snap: only the axes that
 * aligned get adjusted). If there is no guide and `grid.enabled`, it
 * snaps to the grid (both axes). If neither is on (or neither finds a
 * candidate), the raw position is returned.
 */
export function resolveSnap(rect: Rect, others: Rect[], config: SnapConfig): SnapResult {
  if (config.guides.enabled) {
    const { guides, snappedPos } = calculateSnapGuides(rect, others, config.guides.threshold);
    if (guides.length > 0) {
      return { pos: snappedPos, guides };
    }
  }
  if (config.grid.enabled) {
    const { col, row } = pixelsToColRow(rect.x, rect.y, config.grid.spec);
    return { pos: colRowToPixels(col, row, config.grid.spec), guides: [] };
  }
  return { pos: { x: rect.x, y: rect.y }, guides: [] };
}
