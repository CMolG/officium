// Port of javadaba-web-os/lib/desktopGrid.ts (commit 1b2fec5), generalized to
// GridSpec.
//
// Fidelity: the effective row origin in the original is
// `max(GRID_PADDING.y, TOP_BAR_HEIGHT + 16)` = 48 (desktopGrid.ts:31,38), not
// bare `padding.y` — captured here as `spec.originY` (default 48, see
// `DEFAULT_GRID_SPEC` in `./types`).
//
// Generalization relative to the original: there, items are web-os desktop's
// own `widget | shortcut` discriminated union. The engine doesn't know its
// consumers' domain, so here `GridItem` is minimal (id + position + size in
// cells); web-os's specific converters (`widgetToGridItem`,
// `shortcutToGridItem`, `repackAll`...) stay at the source — they're not
// ported.

import type { GridSpec } from './types';
import { DEFAULT_GRID_SPEC } from './types';

export interface GridItem {
  id: string;
  col: number;
  row: number;
  cols: number;
  rows: number;
}

const stepX = (spec: GridSpec): number => spec.cell.width + spec.cell.gap;
const stepY = (spec: GridSpec): number => spec.cell.height + spec.cell.gap;
const originY = (spec: GridSpec): number => spec.originY ?? spec.padding.y;

// ── Pixel <-> cell quantization ─────────────────────────────────────────────

export function getGridColCount(screenWidth: number, spec: GridSpec = DEFAULT_GRID_SPEC): number {
  return Math.max(1, Math.floor((screenWidth - spec.padding.x * 2) / stepX(spec)));
}

export function colRowToPixels(
  col: number,
  row: number,
  spec: GridSpec = DEFAULT_GRID_SPEC,
): { x: number; y: number } {
  return {
    x: spec.padding.x + col * stepX(spec),
    y: originY(spec) + row * stepY(spec),
  };
}

export function pixelsToColRow(
  x: number,
  y: number,
  spec: GridSpec = DEFAULT_GRID_SPEC,
): { col: number; row: number } {
  return {
    col: Math.max(0, Math.round((x - spec.padding.x) / stepX(spec))),
    row: Math.max(0, Math.round((y - originY(spec)) / stepY(spec))),
  };
}

// ── Collision detection (sizes in cell units) ───────────────────────────────

export function isCellRangeFree(
  matrix: boolean[][],
  col: number,
  row: number,
  size: { cols: number; rows: number },
  colCount: number,
): boolean {
  if (col + size.cols > colCount) return false;
  for (let r = row; r < row + size.rows; r++) {
    if (r >= matrix.length) return true;
    for (let c = col; c < col + size.cols; c++) {
      if (matrix[r][c]) return false;
    }
  }
  return true;
}

export function findNextFreePosition(
  matrix: boolean[][],
  size: { cols: number; rows: number },
  colCount: number,
  preferredCol = 0,
  preferredRow = 0,
): { col: number; row: number } {
  if (isCellRangeFree(matrix, preferredCol, preferredRow, size, colCount)) {
    return { col: preferredCol, row: preferredRow };
  }
  const maxRows = matrix.length + 4;
  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col <= colCount - size.cols; col++) {
      if (isCellRangeFree(matrix, col, row, size, colCount)) return { col, row };
    }
  }
  return { col: 0, row: maxRows };
}

/** Search for the euclidean-nearest free gap to the requested origin. */
export function findNearestFreePosition(
  matrix: boolean[][],
  size: { cols: number; rows: number },
  colCount: number,
  origCol: number,
  origRow: number,
): { col: number; row: number } {
  if (isCellRangeFree(matrix, origCol, origRow, size, colCount)) {
    return { col: origCol, row: origRow };
  }
  const maxRows = matrix.length + 4;
  let bestPos = { col: 0, row: maxRows };
  let bestScore = Infinity;
  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c <= colCount - size.cols; c++) {
      const dr = Math.abs(r - origRow);
      const dc = Math.abs(c - origCol);
      const score = dr * dr + dc * dc + dr * 0.1;
      if (score >= bestScore) continue;
      if (isCellRangeFree(matrix, c, r, size, colCount)) {
        bestScore = score;
        bestPos = { col: c, row: r };
      }
    }
  }
  return bestPos;
}

function emptyMatrix(rows: number, colCount: number): boolean[][] {
  return Array.from({ length: rows }, () => Array(colCount).fill(false));
}

function markMatrix(
  matrix: boolean[][],
  col: number,
  row: number,
  cols: number,
  rows: number,
  colCount: number,
): void {
  for (let r = row; r < row + rows; r++) {
    for (let c = col; c < col + cols; c++) {
      if (r < matrix.length && c < colCount) matrix[r][c] = true;
    }
  }
}

// ── Packing ──────────────────────────────────────────────────────────────

/** Packs every item from top-left, in row/col order. */
export function packGridItems(items: GridItem[], colCount: number): GridItem[] {
  const sorted = [...items].sort((a, b) => a.row - b.row || a.col - b.col);
  const packed: GridItem[] = [];
  const matrix = emptyMatrix(40, colCount);
  for (const item of sorted) {
    const pos = findNextFreePosition(matrix, item, colCount);
    packed.push({ ...item, col: pos.col, row: pos.row });
    markMatrix(matrix, pos.col, pos.row, item.cols, item.rows, colCount);
  }
  return packed;
}

/**
 * Places `priorityItem` at `(targetCol, targetRow)` (clamped to the grid's
 * bounds) and repacks only the `otherItems` that collide with it, moving
 * them to the euclidean-nearest free gap to their current position. Items
 * that don't collide aren't moved.
 */
export function packGridItemsAround(
  priorityItem: GridItem,
  targetCol: number,
  targetRow: number,
  otherItems: GridItem[],
  colCount: number,
): GridItem[] {
  const clampedCol = Math.min(targetCol, Math.max(0, colCount - priorityItem.cols));
  const clampedRow = Math.max(0, targetRow);
  const placed: GridItem = { ...priorityItem, col: clampedCol, row: clampedRow };

  const matrix = emptyMatrix(40, colCount);
  markMatrix(matrix, clampedCol, clampedRow, priorityItem.cols, priorityItem.rows, colCount);

  const pEndR = clampedRow + priorityItem.rows;
  const pEndC = clampedCol + priorityItem.cols;
  const colliding: GridItem[] = [];
  const nonColliding: GridItem[] = [];
  for (const item of otherItems) {
    const iEndR = item.row + item.rows;
    const iEndC = item.col + item.cols;
    const overlaps = item.row < pEndR && iEndR > clampedRow && item.col < pEndC && iEndC > clampedCol;
    (overlaps ? colliding : nonColliding).push(item);
  }

  const result: GridItem[] = [placed];
  for (const item of nonColliding) {
    markMatrix(matrix, item.col, item.row, item.cols, item.rows, colCount);
    result.push(item);
  }

  const collidingSorted = [...colliding].sort((a, b) => a.row - b.row || a.col - b.col);
  for (const item of collidingSorted) {
    const pos = findNearestFreePosition(matrix, item, colCount, item.col, item.row);
    result.push({ ...item, col: pos.col, row: pos.row });
    markMatrix(matrix, pos.col, pos.row, item.cols, item.rows, colCount);
  }

  return result;
}
