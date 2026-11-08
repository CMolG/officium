import { profilesIn } from "./profile-metrics";
import type {
  Actor,
  Card,
  Category,
  CategoryMetric,
  ContributionMetric,
  LongestOpenCard,
  Metrics,
  RejectedMetrics,
  TokenCounts,
} from "../types";
import type { Subscription, ValueFigures, ValueView } from "../value-types";
import { isFinished } from "../link-lists";
import { isClosed } from "../status-config";
import { isDelivered, now } from "./rules";
import { MemoryCardTime } from "./card-time";
import { reviewReturnsIn } from "./review-return-metrics";
import { tokenCoverageIn } from "./token-coverage";

/**
 * How the cards flowed, read from their transitions (the API's `DeliveryFlow`): the FIRST time each
 * reached review/deploy/done -- transitions are appended in order, so the first match per card is
 * chronologically first -- and when each last entered the status it is in now. A rejection cancels
 * the card's delivery and start (card://JAVA-1415).
 */
function flowOf(transitions: readonly { cardId: string; status: Card["status"]; at: string; actor: Actor }[], byId: Map<string, Card>) {
  const firstDelivered = new Map<string, { at: string; actor: Actor }>();
  const firstDoing = new Map<string, string>();
  const firstReviewOrLater = new Map<string, string>();
  const lastEnteredCurrentStatus = new Map<string, string>();
  for (const t of transitions) {
    const card = byId.get(t.cardId);
    if (!card) continue;
    if (t.status === "rejected") {
      firstDelivered.delete(t.cardId);
      firstDoing.delete(t.cardId);
      firstReviewOrLater.delete(t.cardId);
    }
    if (isDelivered(t.status) && !firstDelivered.has(t.cardId)) firstDelivered.set(t.cardId, { at: t.at, actor: t.actor });
    if (t.status === "doing" && !firstDoing.has(t.cardId)) firstDoing.set(t.cardId, t.at);
    if (isDelivered(t.status) && !firstReviewOrLater.has(t.cardId)) firstReviewOrLater.set(t.cardId, t.at);
    if (t.status === card.status) lastEnteredCurrentStatus.set(t.cardId, t.at);
  }
  return { firstDelivered, firstDoing, firstReviewOrLater, lastEnteredCurrentStatus };
}

/** The API's `RejectionTally`: the period's rejected cards by reason and by category, most first. */
function rejectedIn(rejected: Card[]): RejectedMetrics {
  const count = <K,>(keyOf: (card: Card) => K) => {
    const counts = new Map<K, number>();
    for (const card of rejected) counts.set(keyOf(card), (counts.get(keyOf(card)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };
  return {
    total: rejected.length,
    byReason: count((c) => c.rejection?.reason ?? "other").map(([reason, n]) => ({ reason, count: n })),
    byCategory: count((c) => c.category).map(([category, n]) => ({ category, count: n })),
  };
}

/** The memory backend keeps no usage to price, so its value report is the empty one; the price a person sets is
 *  kept for the tab, as the API keeps it per account. */
const EMPTY_VALUE: ValueFigures = {
  delivered: 0,
  imputed: 0,
  agentHours: 0,
  classifiedHours: 0,
  unattendedHours: 0,
  tokens: 0,
  apiValue: 0,
  unpricedRows: 0,
  unpricedModels: [],
  costPerDeliveredCard: null,
  valuePerDollar: null,
};

export class MemoryMetrics extends MemoryCardTime {
  private monthlyUsd: number | null = null;

  async getValue(projectId: string, month: string): Promise<ValueView> {
    this.requireRecord(projectId);
    return {
      month,
      current: { ...EMPTY_VALUE },
      previous: { ...EMPTY_VALUE },
      breakdown: { byCategory: [], byPhase: [], byModel: [] },
    };
  }

  async getSubscription(): Promise<Subscription> {
    return { monthlyUsd: this.monthlyUsd };
  }

  async setSubscription(monthlyUsd: number): Promise<Subscription> {
    this.monthlyUsd = monthlyUsd;
    return { monthlyUsd };
  }

  async getMetrics(projectId: string, query: { from: string; to: string } | { sprintId: string }): Promise<Metrics> {
    const record = this.requireRecord(projectId);
    let from: string;
    let to: string;
    let sprintId: string | null = null;
    if ("sprintId" in query) {
      const sprint = this.requireSprint(record, query.sprintId);
      sprintId = sprint.id;
      from = (sprint.startedAt ?? sprint.createdAt).slice(0, 10);
      to = (sprint.closedAt ?? now()).slice(0, 10);
    } else {
      from = query.from;
      to = query.to;
    }
    const fromAt = `${from}T00:00:00.000Z`;
    const toAt = `${to}T23:59:59.999Z`;
    const inRange = (at: string) => at >= fromAt && at <= toAt;

    const cards = [...record.cards.values()].filter((c) => sprintId === null || c.sprintId === sprintId);
    const cardIds = new Set(cards.map((c) => c.id));
    const byId = new Map(cards.map((c) => [c.id, c]));

    const { firstDelivered, firstDoing, firstReviewOrLater, lastEnteredCurrentStatus } = flowOf(record.transitions, byId);

    const deliveredEntries = [...firstDelivered.entries()].filter(([, v]) => inRange(v.at));
    const delivered = deliveredEntries.length;

    const relevantTimeEntries = [...record.details.entries()]
      .filter(([cardId]) => cardIds.has(cardId))
      .flatMap(([, detail]) => detail.timeEntries)
      .filter((e) => e.date >= from && e.date <= to);
    const total = relevantTimeEntries.reduce((sum, e) => sum + e.hours, 0);
    const manual = relevantTimeEntries.filter((e) => e.source === "manual").reduce((sum, e) => sum + e.hours, 0);
    const refine = relevantTimeEntries.filter((e) => e.concept === "refine").reduce((sum, e) => sum + e.hours, 0);
    const test = relevantTimeEntries.filter((e) => e.concept === "test").reduce((sum, e) => sum + e.hours, 0);
    const byModel = new Map<string, TokenCounts>();
    for (const e of relevantTimeEntries) {
      if (e.tokensOut === null) continue;
      const counts = byModel.get(e.model ?? "unknown") ?? { tokensIn: 0, cachedTokensIn: 0, reasoningTokens: 0, tokensOut: 0 };
      counts.tokensIn += e.tokensIn ?? 0;
      counts.cachedTokensIn += e.cachedTokensIn ?? 0;
      counts.reasoningTokens += e.reasoningTokens ?? 0;
      counts.tokensOut += e.tokensOut;
      byModel.set(e.model ?? "unknown", counts);
    }
    const models = [...byModel.entries()]
      .map(([model, counts]) => ({ model, ...counts }))
      .sort((a, b) => b.tokensOut - a.tokensOut);
    const sumOf = (field: keyof TokenCounts) => models.reduce((sum, m) => sum + m[field], 0);
    const coverage = tokenCoverageIn(
      deliveredEntries.map(([cardId]) => cardId),
      (cardId) => record.details.get(cardId)?.timeEntries ?? [],
      relevantTimeEntries,
    );

    const contributionsByWho = new Map<string, ContributionMetric>();
    const bump = (who: string, kind: "person" | "agent", delta: { delivered?: number; hours?: number }) => {
      const entry = contributionsByWho.get(who) ?? { who, kind, delivered: 0, hours: 0 };
      entry.delivered += delta.delivered ?? 0;
      entry.hours += delta.hours ?? 0;
      contributionsByWho.set(who, entry);
    };
    for (const [, v] of deliveredEntries) bump(v.actor.name, v.actor.kind, { delivered: 1 });
    for (const entry of relevantTimeEntries) bump(entry.who, entry.source === "manual" ? "person" : "agent", { hours: entry.hours });
    const contributions = [...contributionsByWho.values()].sort((a, b) => b.delivered - a.delivered || b.hours - a.hours);

    const categories = new Map<Category | null, Card[]>();
    for (const card of cards) categories.set(card.category, [...(categories.get(card.category) ?? []), card]);
    const byCategory: CategoryMetric[] = [...categories.entries()].map(([category, group]) => {
      const deliveredInGroup = group.filter((c) => {
        const d = firstDelivered.get(c.id);
        return d && inRange(d.at);
      }).length;
      const cycles = group.flatMap((c) => {
        const doing = firstDoing.get(c.id);
        const later = firstReviewOrLater.get(c.id);
        if (!doing || !later || later < doing) return [];
        return [(Date.parse(later) - Date.parse(doing)) / 3_600_000];
      });
      const logged = group.flatMap((c) => {
        const entries = record.details.get(c.id)?.timeEntries ?? [];
        return entries.length ? [entries.reduce((sum, e) => sum + e.hours, 0)] : [];
      });
      const mean = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);
      return { category, delivered: deliveredInGroup, meanCycleHours: mean(cycles), meanLoggedHours: mean(logged) };
    });

    const nowMs = Date.now();
    const longestOpen: LongestOpenCard[] = cards
      .filter((c) => !isFinished(c.status) && !isClosed(c.status))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 10)
      .map((c) => ({
        key: c.key,
        title: c.title,
        status: c.status,
        category: c.category,
        ageHours: (nowMs - Date.parse(c.createdAt)) / 3_600_000,
        inStatusHours: (nowMs - Date.parse(lastEnteredCurrentStatus.get(c.id) ?? c.createdAt)) / 3_600_000,
      }));

    return {
      period: { from, to, sprintId },
      delivered,
      hours: { total, imputed: total - manual, manual, refine, test, work: total - refine - test },
      tokens: {
        tokensIn: sumOf("tokensIn"),
        cachedTokensIn: sumOf("cachedTokensIn"),
        reasoningTokens: sumOf("reasoningTokens"),
        tokensOut: sumOf("tokensOut"),
        byModel: models,
        perDelivery: coverage.perDelivery,
      },
      tokenCoverage: coverage.view,
      contributions,
      byCategory,
      longestOpen,
      reviewReturns: reviewReturnsIn(cards, record, inRange),
      profiles: profilesIn(record, cards, inRange, relevantTimeEntries),
      rejected: rejectedIn(cards.filter((c) => {
        const at = lastEnteredCurrentStatus.get(c.id) ?? c.createdAt;
        return c.status === "rejected" && inRange(at);
      })),
    };
  }

  // ---- organization: people and teams (officium-api.md §8.5, JAVA-57) ------------------------
}
