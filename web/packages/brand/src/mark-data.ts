/*
 * mark-data.ts: the Javadaba mark's geometry, from Library 11 ("Many rooms, one house"): nine
 * colored diamonds and a black one that holds them, on a 10:4 canvas. Positions are shares of the
 * canvas; each colored diamond is 14.14% by 35.36%, turned 45 degrees, and the black one is twice
 * as large (28.28% by 70.71%).
 */

export interface MarkDiamond {
  color: string;
  left: number;
  top: number;
  /** Which of the three columns the diamond sits in (0 is the farthest from the black one). */
  column: 0 | 1 | 2;
  /** Which of the three rows. */
  row: 0 | 1 | 2;
}

const d = (color: string, left: number, top: number, column: 0 | 1 | 2, row: 0 | 1 | 2): MarkDiamond => ({
  color,
  left,
  top,
  column,
  row,
});

export const MARK_DIAMONDS: readonly MarkDiamond[] = [
  d("#DB3E3E", 12.93, 7.32, 0, 0),
  d("#A260C9", 32.93, 7.32, 1, 0),
  d("#5C95FF", 52.93, 7.32, 2, 0),
  d("#EED15D", 2.93, 32.32, 0, 1),
  d("#C4DB3E", 22.93, 32.32, 1, 1),
  d("#DB923E", 42.93, 32.32, 2, 1),
  d("#004483", 12.93, 57.32, 0, 2),
  d("#8F0002", 32.93, 57.32, 1, 2),
  d("#3EDBAA", 52.93, 57.32, 2, 2),
];

/** The mark's canvas is 2.5 times as wide as it is tall. */
export const MARK_ASPECT = 2.5;

/**
 * How far a diamond hides behind the black one, in units of half the black diamond's box, and how
 * long it waits when the colors slide out: the nearest column first, the middle row half a step
 * further out.
 */
export function slideOut(diamond: MarkDiamond): { units: number; delayMs: number } {
  const step = 2 - diamond.column;
  const stagger = diamond.row === 1 ? 0.5 : 0;
  return { units: 1 + step + stagger, delayMs: Math.round((step * 60 + stagger * 60) * 1) };
}
