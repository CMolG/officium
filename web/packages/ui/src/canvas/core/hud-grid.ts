// packages/ui/src/canvas/core/hud-grid.ts
//
// PROVENANCE NOTE: the plan (#20, Task 4) describes this as a port of
// Fluxor's `src/renderer/logic/hud-grid.ts` (188 LOC, pure: `HUD_GRID=24`,
// `SAFE_ZONE`, spiral `resolveHudWidgetPlacement`). This run was forbidden
// from reading/writing `../fluxor/fluxor-ide` (an editing exception reserved
// for the plan's adoption task, out of scope here) — so this is its own
// reconstruction from the CONTRACT described in the plan (constant,
// quantization to the HUD grid, clamp to viewport/safe-zone, deterministic
// anti-overlap spiral placement), not a literal transcription of the
// original file. Re-verify against the original in adoption Task 10 (out of
// scope for this run).

import type { Point, Rect, Size } from './types';

export const HUD_GRID = 24;

export function snapToHudGrid(value: number, grid: number = HUD_GRID): number {
  return Math.round(value / grid) * grid;
}

/**
 * Clamps `rect` so it stays inside `safeZone` (or the full `viewport` if
 * omitted). If `rect` is bigger than the zone, it's anchored to its
 * top-left corner.
 */
export function clampToViewport(rect: Rect, viewport: Size, safeZone?: Rect): Rect {
  const bounds = safeZone ?? { x: 0, y: 0, width: viewport.width, height: viewport.height };
  const maxX = Math.max(bounds.x, bounds.x + bounds.width - rect.width);
  const maxY = Math.max(bounds.y, bounds.y + bounds.height - rect.height);
  return {
    ...rect,
    x: Math.min(Math.max(rect.x, bounds.x), maxX),
    y: Math.min(Math.max(rect.y, bounds.y), maxY),
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export interface ResolveHudPlacementOptions {
  viewport: Size;
  size: Size;
  /** Preferred position (top-left, before quantizing). Defaults to the safe-zone's top-right corner. */
  preferred?: Point;
  /** Widgets already placed, to avoid. */
  others: Rect[];
  /** Safe zone inside the viewport (e.g. subtracting fixed bars). Defaults to the full viewport. */
  safeZone?: (viewport: Size) => Rect;
  grid?: number;
  /** Cap on spiral search rings (anti-loop safeguard). */
  maxRings?: number;
}

/**
 * Places a HUD widget of `size` near `preferred`, quantized to `HUD_GRID`,
 * searching in a spiral (growing-radius rings, 8 directions per ring: E, SE,
 * S, SW, W, NW, N, NE) for the first position that doesn't overlap any of
 * `others` and fits inside the safe-zone. Deterministic: the same inputs
 * always produce the same result (no randomness, no clock).
 */
export function resolveHudWidgetPlacement(options: ResolveHudPlacementOptions): Rect {
  const grid = options.grid ?? HUD_GRID;
  const bounds = options.safeZone
    ? options.safeZone(options.viewport)
    : { x: 0, y: 0, width: options.viewport.width, height: options.viewport.height };
  const preferred = options.preferred ?? { x: bounds.x + bounds.width - options.size.width, y: bounds.y };

  const candidateAt = (x: number, y: number): Rect =>
    clampToViewport(
      { x: snapToHudGrid(x, grid), y: snapToHudGrid(y, grid), width: options.size.width, height: options.size.height },
      options.viewport,
      bounds,
    );

  const isFree = (rect: Rect): boolean => !options.others.some((other) => rectsOverlap(rect, other));

  const first = candidateAt(preferred.x, preferred.y);
  if (isFree(first)) return first;

  const maxRings = options.maxRings ?? 24;
  for (let ring = 1; ring <= maxRings; ring++) {
    const offset = ring * grid;
    const points: Point[] = [
      { x: preferred.x + offset, y: preferred.y },
      { x: preferred.x + offset, y: preferred.y + offset },
      { x: preferred.x, y: preferred.y + offset },
      { x: preferred.x - offset, y: preferred.y + offset },
      { x: preferred.x - offset, y: preferred.y },
      { x: preferred.x - offset, y: preferred.y - offset },
      { x: preferred.x, y: preferred.y - offset },
      { x: preferred.x + offset, y: preferred.y - offset },
    ];
    for (const point of points) {
      const candidate = candidateAt(point.x, point.y);
      if (isFree(candidate)) return candidate;
    }
  }

  // Safe-zone saturated: deterministic best-effort instead of an endless loop.
  return first;
}
