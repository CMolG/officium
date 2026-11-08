import type { Card, ReviewReturnMetrics } from "../types";
import type { ProjectRecord } from "./sample-record";

/**
 * The API's `ReviewReturnTally` (card://JAVA-1416): the period's send-backs by reason and category, most first,
 * and the cards that went through review and whose first arrival at deploy or done after it fell in the period,
 * with those never sent back before it. A card that reached deploy or done without a review never counts.
 */
export function reviewReturnsIn(cards: Card[], record: ProjectRecord, inRange: (at: string) => boolean): ReviewReturnMetrics {
  const count = <K,>(entries: [K, number][]) =>
    [...entries.reduce((counts, [key, n]) => counts.set(key, (counts.get(key) ?? 0) + n), new Map<K, number>())].sort((a, b) => b[1] - a[1]);
  const inPeriod = cards.flatMap((card) => (card.reviewReturns ?? []).filter((r) => inRange(r.at)).map((r) => ({ card, r })));
  const reviewed = new Set<string>();
  const firstPass = new Map<string, string>();
  for (const t of record.transitions) {
    if (t.status === "review") reviewed.add(t.cardId);
    else if ((t.status === "deploy" || t.status === "done") && reviewed.has(t.cardId) && !firstPass.has(t.cardId)) firstPass.set(t.cardId, t.at);
  }
  const passed = cards.filter((c) => firstPass.has(c.id) && inRange(firstPass.get(c.id) as string));
  const firstTime = passed.filter((c) => !(c.reviewReturns ?? []).some((r) => r.at < (firstPass.get(c.id) as string)));
  return {
    total: inPeriod.length,
    byReason: count(inPeriod.flatMap(({ r }) => r.reasons.map((reason): [typeof reason, number] => [reason, 1]))).map(([reason, n]) => ({ reason, count: n })),
    byCategory: count(inPeriod.map(({ card }): [Card["category"], number] => [card.category, 1])).map(([category, n]) => ({ category, count: n })),
    firstTimePass: { passed: passed.length, firstTime: firstTime.length, share: passed.length ? firstTime.length / passed.length : null },
  };
}
