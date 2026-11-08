// Which versions of a page are kept (JAVA-794, design §4). The in-memory repository mirrors the
// API's `DocHistoryPolicy` so the e2e suite exercises the same rule; it is pure and has no clock.

export interface PolicyRevision {
  id: string;
  version: number;
  weightBytes: number;
  retiredAt: string;
  heaviest: boolean;
}

const RECENT_KEPT = 2;
const DAY_MS = 86_400_000;

/**
 * Keeps the two latest versions (until `historyDays` after they retired) and the heaviest ever, which
 * never expires. Ties go to the lower version, so the current version, the newest, is the heaviest
 * only by being strictly heavier, and then nothing is flagged. A window of 0 keeps only the heaviest.
 */
export function applyHistoryPolicy<R extends PolicyRevision>(
  kept: R[],
  retiring: R | null,
  currentWeight: number,
  historyDays: number,
  now: Date,
): { kept: R[]; dropped: R[] } {
  const candidates = retiring ? [...kept, retiring] : [...kept];
  const top = candidates.reduce<R | null>(
    (best, next) =>
      !best || next.weightBytes > best.weightBytes || (next.weightBytes === best.weightBytes && next.version < best.version) ? next : best,
    null,
  );
  const heaviest = top && top.weightBytes >= currentWeight ? top : null;
  const recent = new Set([...candidates].sort((a, b) => b.version - a.version).slice(0, RECENT_KEPT).map((r) => r.id));
  const cutoff = now.getTime() - historyDays * DAY_MS;
  const keep: R[] = [];
  const dropped: R[] = [];
  for (const candidate of candidates) {
    const isHeaviest = heaviest?.id === candidate.id;
    const live = historyDays > 0 && recent.has(candidate.id) && new Date(candidate.retiredAt).getTime() >= cutoff;
    if (isHeaviest || live) keep.push({ ...candidate, heaviest: isHeaviest });
    else dropped.push(candidate);
  }
  keep.sort((a, b) => b.version - a.version);
  return { kept: keep, dropped };
}

/** When a kept version expires, or `null` for the heaviest. */
export function expiresAt(revision: PolicyRevision, historyDays: number): string | null {
  return revision.heaviest ? null : new Date(new Date(revision.retiredAt).getTime() + historyDays * DAY_MS).toISOString();
}
