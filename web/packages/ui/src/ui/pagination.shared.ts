/** A slot of the pager: a page number, or the "…" that stands for the pages left out. */
export type PageSlot = number | "gap";

/**
 * Which slots a pager shows (Lib-Pieces § Pagination): the first and last page, the current one with one
 * neighbour each side, and a "…" wherever pages are left out. 7 pages or fewer are all shown. Pure, so the
 * rule is tested without a DOM. `page` is 1-based and is clamped into range.
 */
export function pageSlots(page: number, count: number): PageSlot[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);
  const current = Math.min(Math.max(page, 1), count);
  const wanted = new Set([1, count, current - 1, current, current + 1]);
  // Near an edge, show enough pages that the pager keeps the same width.
  if (current <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (current >= count - 2) [count - 1, count - 2, count - 3].forEach((n) => wanted.add(n));
  const sorted = [...wanted].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const slots: PageSlot[] = [];
  sorted.forEach((n, index) => {
    const before = sorted[index - 1];
    if (before !== undefined && n - before === 2) slots.push(before + 1);
    else if (before !== undefined && n - before > 2) slots.push("gap");
    slots.push(n);
  });
  return slots;
}

/** "Jobs 21 to 40 of 132" without the noun: the range a page covers. */
export function pageRange(page: number, size: number, total: number): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * size + 1, to: Math.min(page * size, total) };
}
