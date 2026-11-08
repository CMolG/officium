// packages/ui/src/canvas/core/selection.ts
//
// Marquee (AABB) math and selection modes, generalized from the hit-test
// in `SeamlessCanvas.tsx:301-328` (the marquee's screen->world conversion)
// and `JavadabaOS.tsx:3084` (AABB) from the verified sources.

import type { Rect } from './types';

export type SelectionMode = 'replace' | 'add' | 'toggle';

/** An item that is a candidate for the marquee hit-test: its id + its rect in the same space as the drag rect. */
export interface SelectableRect extends Rect {
  id: string;
}

/** Normaliza dos esquinas arrastradas (en cualquier orden) a un Rect valido (width/height >= 0). */
export function rectFromDrag(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Ids of the items whose AABB intersects `rect` (marquee). */
export function itemsInRect(items: SelectableRect[], rect: Rect): string[] {
  return items.filter((item) => rectsIntersect(item, rect)).map((item) => item.id);
}

/**
 * Applies `ids` to the `current` selection according to `mode`:
 * - `replace`: the selection becomes exactly `ids`.
 * - `add`: `ids` get added to the existing selection (union).
 * - `toggle`: every id in `ids` that was already there gets removed; the
 *   rest get added.
 */
export function applySelectionMode(current: ReadonlySet<string>, ids: string[], mode: SelectionMode): Set<string> {
  if (mode === 'replace') return new Set(ids);

  const next = new Set(current);
  if (mode === 'add') {
    for (const id of ids) next.add(id);
    return next;
  }

  // toggle
  for (const id of ids) {
    if (next.has(id)) next.delete(id);
    else next.add(id);
  }
  return next;
}
