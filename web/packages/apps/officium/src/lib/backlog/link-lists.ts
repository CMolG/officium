import type { Card, Status } from "./types";

/** `Status.finished()` in the API: Deploy or Completed -- blocks nobody, needs no one. */
export const isFinished = (status: Status) => status === "deploy" || status === "done";

/** One stored `blocks` edge: `source` blocks `target`, by card key. It never changes with a status. */
export type BlockEdge = readonly [source: string, target: string];

/**
 * The TS twin of the API's `CardLinkLists` (JAVA-1114): rebuilds every card's `blocks`, `blockedBy`,
 * `relatedBy` and `blocked` from the stored edges and the blockers' current statuses. An edge whose
 * blocker is finished reads as `relatedBy` on both cards, and blocks again if the blocker reopens.
 */
export function recomputeLinks(cards: Map<string, Card>, edges: readonly BlockEdge[]) {
  const byKey = new Map<string, Card>();
  for (const card of cards.values()) byKey.set(card.key, card);
  for (const card of cards.values()) {
    card.blocks = [];
    card.blockedBy = [];
    card.relatedBy = [];
  }
  for (const [sourceKey, targetKey] of edges) {
    const source = byKey.get(sourceKey);
    const target = byKey.get(targetKey);
    if (!source || !target) continue;
    if (isFinished(source.status)) {
      source.relatedBy.push({ key: targetKey, direction: "blockedByThis" });
      target.relatedBy.push({ key: sourceKey, direction: "blockedThis" });
    } else {
      source.blocks.push(targetKey);
      target.blockedBy.push(sourceKey);
    }
  }
  for (const card of cards.values()) card.blocked = card.blockedBy.length > 0;
}

/** Adding `sourceKey blocks targetKey` would close a cycle if `targetKey` already reaches
 *  `sourceKey` through stored edges, finished blockers included (a reopened one blocks again). */
export function wouldCycle(edges: readonly BlockEdge[], sourceKey: string, targetKey: string): boolean {
  if (sourceKey === targetKey) return true;
  const seen = new Set<string>();
  const queue = [targetKey];
  while (queue.length > 0) {
    const key = queue.shift();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (key === sourceKey) return true;
    for (const [from, to] of edges) if (from === key) queue.push(to);
  }
  return false;
}
