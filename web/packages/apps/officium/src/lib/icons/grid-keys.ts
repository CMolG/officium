/** Where one option sits on screen, so Up and Down follow the rows the wrap actually made. */
export interface GridRect {
  top: number;
  left: number;
}

/**
 * The option a key moves focus to, or `null` when the key does nothing here. Left and Right step through
 * the list; Up and Down go to the nearest option of the adjacent row, by position, because the number of
 * columns changes with the width.
 */
export function gridNext(key: string, current: number, cells: GridRect[]): number | null {
  if (cells.length === 0) return null;
  switch (key) {
    case "ArrowRight":
      return Math.min(cells.length - 1, current + 1);
    case "ArrowLeft":
      return Math.max(0, current - 1);
    case "Home":
      return 0;
    case "End":
      return cells.length - 1;
    case "ArrowDown":
      return adjacentRow(cells, current, 1);
    case "ArrowUp":
      return adjacentRow(cells, current, -1);
    default:
      return null;
  }
}

function adjacentRow(cells: GridRect[], current: number, direction: 1 | -1): number | null {
  const from = cells[current];
  const tops = cells.map((cell) => cell.top).filter((top) => (direction > 0 ? top > from.top : top < from.top));
  if (tops.length === 0) return null;
  const target = direction > 0 ? Math.min(...tops) : Math.max(...tops);
  let best: number | null = null;
  let bestDistance = Infinity;
  cells.forEach((cell, index) => {
    if (cell.top !== target) return;
    const distance = Math.abs(cell.left - from.left);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}
