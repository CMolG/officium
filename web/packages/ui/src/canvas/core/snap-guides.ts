// packages/ui/src/canvas/core/snap-guides.ts
//
// Port of `calculateSnapGuides` (Fluxor `desktop-store.ts:1497-1533`,
// `SNAP_THRESHOLD=8`, edge+center) as a pure function in core/, with
// nothing from Fluxor's store. Per axis, it picks the best alignment
// candidate (leading edge, center, or trailing edge) between `rect` and
// each of `others` within `threshold`; if several candidates are valid,
// it keeps the one with the smallest displacement.
//
// It is born here as a dedicated module (Task 3); `core/snap.ts` (Task 2)
// delegates to this implementation instead of keeping its own copy — see
// the evolution comment in snap.ts.

import type { Point, Rect, SnapGuide } from './types';

export interface SnapGuidesResult {
  guides: SnapGuide[];
  snappedPos: Point;
}

interface Candidate {
  value: number;
}

function edgesX(r: Rect): Candidate[] {
  return [{ value: r.x }, { value: r.x + r.width / 2 }, { value: r.x + r.width }];
}

function edgesY(r: Rect): Candidate[] {
  return [{ value: r.y }, { value: r.y + r.height / 2 }, { value: r.y + r.height }];
}

export function calculateSnapGuides(rect: Rect, others: Rect[], threshold: number): SnapGuidesResult {
  let bestX: { delta: number; guide: SnapGuide } | null = null;
  let bestY: { delta: number; guide: SnapGuide } | null = null;

  for (const other of others) {
    for (const re of edgesX(rect)) {
      for (const oe of edgesX(other)) {
        const delta = oe.value - re.value;
        if (Math.abs(delta) <= threshold && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
          const from = Math.min(rect.y, other.y);
          const to = Math.max(rect.y + rect.height, other.y + other.height);
          bestX = { delta, guide: { orientation: 'vertical', position: oe.value, from, to } };
        }
      }
    }
    for (const re of edgesY(rect)) {
      for (const oe of edgesY(other)) {
        const delta = oe.value - re.value;
        if (Math.abs(delta) <= threshold && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) {
          const from = Math.min(rect.x, other.x);
          const to = Math.max(rect.x + rect.width, other.x + other.width);
          bestY = { delta, guide: { orientation: 'horizontal', position: oe.value, from, to } };
        }
      }
    }
  }

  const guides: SnapGuide[] = [];
  const snappedPos: Point = { x: rect.x, y: rect.y };
  if (bestX) {
    guides.push(bestX.guide);
    snappedPos.x = rect.x + bestX.delta;
  }
  if (bestY) {
    guides.push(bestY.guide);
    snappedPos.y = rect.y + bestY.delta;
  }
  return { guides, snappedPos };
}
