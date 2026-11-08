// packages/ui/src/canvas/core/z-order.ts
//
// NEW piece — it does not exist in any source. web-os only had an
// `activeId` (65/55, no stack) and Fluxor a transient `mentalZ`; no
// consumer had a real z-order stack. The engine introduces it as a pure
// utility over `Record<id, number>`.

export type ZOrder = Record<string, number>;

function maxZ(order: ZOrder): number {
  return Math.max(0, ...Object.values(order));
}

function minZ(order: ZOrder): number {
  return Math.min(0, ...Object.values(order));
}

/** Raises `id` above all the others. Does not mutate `order`. */
export function bringToFront(order: ZOrder, id: string): ZOrder {
  return { ...order, [id]: maxZ(order) + 1 };
}

/** Lowers `id` below all the others. Does not mutate `order`. */
export function sendToBack(order: ZOrder, id: string): ZOrder {
  return { ...order, [id]: minZ(order) - 1 };
}

/**
 * Compacts `order` values to consecutive indices `0..n-1`, preserving the
 * relative order (stable: ties in value keep the original insertion
 * order).
 */
export function normalize(order: ZOrder): ZOrder {
  const entries = Object.entries(order).sort((a, b) => a[1] - b[1]);
  const next: ZOrder = {};
  entries.forEach(([id], index) => {
    next[id] = index;
  });
  return next;
}
