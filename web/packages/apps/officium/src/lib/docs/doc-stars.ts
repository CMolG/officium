/**
 * How a person's starred list is ordered (JAVA-799, officium-api.md §8.21). The API's
 * `DocStars.place`, written once for the memory twin and the sidebar's optimistic reorder:
 * a star already there keeps its place unless a position says otherwise, and a new one goes last. A position
 * is 0-based, an index among the stars the person sees (`listed`, every one by default) other than the
 * target: the target goes before the listed star at that index, or last when there is none.
 */
export function placeStar<T>(order: readonly T[], target: T, position?: number, listed: (star: T) => boolean = () => true): T[] {
  const next = [...order];
  const current = next.indexOf(target);
  if (current >= 0 && position === undefined) return next;
  if (current >= 0) next.splice(current, 1);
  const wanted = Math.max(0, position ?? Number.MAX_SAFE_INTEGER);
  let seen = 0;
  const before = next.findIndex((star) => listed(star) && seen++ === wanted);
  next.splice(before < 0 ? next.length : before, 0, target);
  return next;
}

/** The list after moving the star at `from` to `to`, as the sidebar's drag or keyboard reorder asks. */
export function moveStar<T>(order: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= order.length) return [...order];
  return placeStar(order.filter((_, index) => index !== from), order[from], to);
}
