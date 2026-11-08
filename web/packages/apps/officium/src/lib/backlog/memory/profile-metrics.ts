import type { TokenCounts } from "../metrics-types";
import {
  DEFAULTS_PROFILE,
  type PhaseRun,
  type ProfileCell,
  type ProfileEscape,
  type ProfileMetrics,
  type ProfileRecommendation,
  type ProfileRow,
} from "../profile-metrics-types";
import type { ReviewOutcome } from "../quality-lineage";
import type { ReviewReturn } from "../review-return-types";
import type { TimeEntry } from "../time-types";
import type { Card } from "../types";
import { allows } from "../../profiles/builtins";
import type { ProjectRecord } from "./sample-record";

// The memory twin of the API's `ProfileTally` (card://JAVA-1527): the same attribution and the same bars.
const RAISE_AT = 0.3;
const MIN_REVIEWED = 5;
const STRONGER: Record<string, string> = { "claude-haiku-5-5": "claude-sonnet-5-5", "claude-sonnet-5-5": "claude-opus-5-5" };
const HEALTH = new Set(["architecture", "clean_code"]);
const ZERO: TokenCounts = { tokensIn: 0, cachedTokensIn: 0, reasoningTokens: 0, tokensOut: 0 };

interface Acc {
  reviewed: number;
  healthy: number;
  firstTime: number;
  passed: number;
  clean: number;
  cleanWithTokens: number;
  hours: number;
  debtHours: number;
  tokens: TokenCounts;
  debtTokens: TokenCounts;
  reasons: Record<string, number>;
  violations: Record<string, number>;
  escaped: Record<string, number>;
}

const acc = (): Acc => ({
  reviewed: 0, healthy: 0, firstTime: 0, passed: 0, clean: 0, cleanWithTokens: 0, hours: 0, debtHours: 0,
  tokens: ZERO, debtTokens: ZERO, reasons: {}, violations: {}, escaped: {},
});
const bump = (counts: Record<string, number>, key: string) => {
  counts[key] = (counts[key] ?? 0) + 1;
};
const share = (part: number, whole: number) => (whole === 0 ? null : Math.round((part * 1000) / whole) / 1000);
const round = (hours: number) => Math.round(hours * 100) / 100;
const plus = (a: TokenCounts, e: TimeEntry): TokenCounts => ({
  tokensIn: a.tokensIn + (e.tokensIn ?? 0),
  cachedTokensIn: a.cachedTokensIn + (e.cachedTokensIn ?? 0),
  reasoningTokens: a.reasoningTokens + (e.reasoningTokens ?? 0),
  tokensOut: a.tokensOut + (e.tokensOut ?? 0),
});
const scaled = (t: TokenCounts, by: number): TokenCounts => ({
  tokensIn: Math.round(t.tokensIn * by),
  cachedTokensIn: Math.round(t.cachedTokensIn * by),
  reasoningTokens: Math.round(t.reasoningTokens * by),
  tokensOut: Math.round(t.tokensOut * by),
});
const sum = (a: TokenCounts, b: TokenCounts): TokenCounts => ({
  tokensIn: a.tokensIn + b.tokensIn,
  cachedTokensIn: a.cachedTokensIn + b.cachedTokensIn,
  reasoningTokens: a.reasoningTokens + b.reasoningTokens,
  tokensOut: a.tokensOut + b.tokensOut,
});

function last(runs: PhaseRun[], cardId: string, from: string, at: string) {
  return runs.filter((r) => r.actorKind === "agent" && r.cardId === cardId && r.from === from && r.at <= at).at(-1) ?? null;
}
/** The run that ran the card's Action before `at`, else its Refine. */
const attribution = (runs: PhaseRun[], cardId: string, at: string) => last(runs, cardId, "doing", at) ?? last(runs, cardId, "refine", at);
const keyOf = (run: PhaseRun) => run.profileId ?? DEFAULTS_PROFILE;
/** A send-back counts unless integration-failed is its only reason, and one whose return is not found counts (JAVA-1804). */
const sentBackOf = (outcome: ReviewOutcome, returns: ReviewReturn[]) => {
  if (outcome.verdict !== "sent_back") return false;
  const send = returns.find((r) => r.id === outcome.reviewReturnId);
  return !send || send.reasons.some((reason) => reason !== "integration-failed");
};

function row(profileId: string, a: Acc): ProfileRow {
  const tokens = sum(a.tokens, a.debtTokens);
  return {
    profileId, reviewed: a.reviewed, firstTime: a.firstTime, passedFirstTime: a.passed,
    firstTimePassRate: share(a.passed, a.firstTime), sendBackReasons: a.reasons, violationsByDimension: a.violations,
    escapedByPhase: a.escaped, codeHealthRate: share(a.healthy, a.reviewed),
    cost: {
      hours: round(a.hours), tokens: a.tokens, debtHours: round(a.debtHours), debtTokens: a.debtTokens,
      cleanDeliveries: a.clean, cleanWithTokens: a.cleanWithTokens,
      hoursPerCleanDelivery: a.clean ? round((a.hours + a.debtHours) / a.clean) : null,
      tokensPerCleanDelivery: a.cleanWithTokens ? scaled(tokens, 1 / a.cleanWithTokens) : null,
    },
  };
}

/** A cell is asked for a stronger model over MIN_REVIEWED reviews when either measure reaches the bar (JAVA-1804). */
const recommend = (c: ProfileCell): ProfileRecommendation[] => {
  if (c.reviewed < MIN_REVIEWED || !c.model || !STRONGER[c.model] || !allows(c.profileId, STRONGER[c.model])) return [];
  const firedBy: ("violations" | "send-backs")[] = [];
  if ((c.violationRate ?? 0) >= RAISE_AT) firedBy.push("violations");
  if ((c.sendBackRate ?? 0) >= RAISE_AT) firedBy.push("send-backs");
  return firedBy.length === 0 ? [] : [{
    profileId: c.profileId, category: c.category, phase: c.phase, model: c.model, raiseTo: STRONGER[c.model],
    reviewed: c.reviewed, violating: c.violating, violationRate: c.violationRate!, sentBack: c.sentBack,
    sendBackRate: c.sendBackRate!, firedBy,
  }];
};

/** `metrics.get` `profiles` for the cards of a period, from the record's phase runs and the cards' logs. */
export function profilesIn(record: ProjectRecord, cards: Card[], inRange: (at: string) => boolean, time: TimeEntry[]): ProfileMetrics {
  const runs = [...(record.phaseRuns ?? [])].sort((a, b) => a.at.localeCompare(b.at));
  const rows = new Map<string, Acc>();
  // The cards that recorded tokens, all time (card://JAVA-1588): the API's tokenCards.
  const recorded = new Set(cards.filter((c) => (record.details.get(c.id)?.timeEntries ?? []).some((e) => e.tokensOut !== null))
    .map((c) => c.id));
  const rowOf = (key: string) => rows.get(key) ?? rows.set(key, acc()).get(key)!;
  const cells = new Map<string, ProfileCell>();
  const catches = new Map<string, [number, number]>();
  const catchOf = (model: string | null) => catches.get(model ?? "unknown") ?? catches.set(model ?? "unknown", [0, 0]).get(model ?? "unknown")!;
  const byKey = new Map(cards.map((c) => [c.key, c]));
  for (const card of cards) {
    const named = (card.escapedDefects ?? []).length > 0;
    (card.reviewOutcomes ?? []).forEach((outcome, index) => {
      const action = attribution(runs, card.id, outcome.at);
      if (!inRange(outcome.at) || !action) return;
      const a = rowOf(keyOf(action));
      const unhealthy = outcome.ruleViolations.some((rule) => HEALTH.has(rule.split(":")[0]));
      a.reviewed += 1;
      a.healthy += unhealthy ? 0 : 1;
      outcome.ruleViolations.forEach((rule) => bump(a.violations, rule.split(":")[0]));
      const cellKey = `${keyOf(action)}|${action.category}|${action.model}`;
      const cell = cells.get(cellKey) ?? { profileId: keyOf(action), category: action.category, phase: "action", model: action.model, reviewed: 0, violating: 0, violationRate: null, sentBack: 0, sendBackRate: null };
      cell.reviewed += 1;
      cell.violating += unhealthy ? 1 : 0;
      cell.sentBack = (cell.sentBack ?? 0) + (sentBackOf(outcome, card.reviewReturns ?? []) ? 1 : 0);
      cells.set(cellKey, cell);
      // The exit's own run: the API stamps both with one instant; here the run takes the card's, a moment earlier.
      const review = runs.filter((r) => r.actorKind === "agent" && r.cardId === card.id && r.from === outcome.from && r.to === outcome.to && r.at <= outcome.at).at(-1);
      if (review) catchOf(review.model)[0] += outcome.ruleViolations.length ? 1 : 0;
      if (index === 0) {
        const passed = outcome.verdict === "approved";
        a.firstTime += 1;
        a.passed += passed ? 1 : 0;
        a.clean += passed && !named ? 1 : 0;
        a.cleanWithTokens += passed && !named && recorded.has(card.id) ? 1 : 0;
      }
    });
    for (const sentBack of card.reviewReturns ?? []) {
      const action = attribution(runs, card.id, sentBack.at);
      if (inRange(sentBack.at) && action) sentBack.reasons.forEach((reason) => bump(rowOf(keyOf(action)).reasons, reason));
    }
  }
  const escapes: ProfileEscape[] = [];
  const debtOf = new Map<string, string>();
  for (const origin of cards) {
    for (const defect of origin.escapedDefects ?? []) {
      const action = attribution(runs, origin.id, defect.at);
      if (!inRange(defect.at) || !action) continue;
      bump(rowOf(keyOf(action)).escaped, defect.escapedIn);
      const corrective = byKey.get(defect.correctiveKey);
      if (corrective) debtOf.set(corrective.id, keyOf(action));
      escapes.push({ originKey: origin.key, correctiveKey: defect.correctiveKey, escapedIn: defect.escapedIn, profileId: keyOf(action), at: defect.at });
      const reviewer = defect.escapedIn === "review" ? last(runs, origin.id, "review", defect.at) : null;
      if (reviewer) catchOf(reviewer.model)[1] += 1;
    }
  }
  const ran = new Set(runs.map((r) => r.cardId));
  for (const entry of time) {
    const debt = debtOf.get(entry.cardId);
    if (debt) {
      const a = rowOf(debt);
      a.debtHours += entry.hours;
      a.debtTokens = plus(a.debtTokens, entry);
      continue; // a corrective card's time is its origin's debt, never also its own
    }
    const profile = entry.profileId ?? (ran.has(entry.cardId) && entry.source === "agentSession" ? DEFAULTS_PROFILE : null);
    if (profile) {
      const a = rowOf(profile);
      a.hours += entry.hours;
      a.tokens = plus(a.tokens, entry);
    }
  }
  const cellRows = [...cells.values()].map((c) => ({ ...c, violationRate: share(c.violating, c.reviewed), sendBackRate: share(c.sentBack ?? 0, c.reviewed) }));
  return {
    thresholds: { violationRate: RAISE_AT, sendBackRate: RAISE_AT, minReviewed: MIN_REVIEWED },
    byProfile: [...rows.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, a]) => row(key, a)),
    reviewerCatch: [...catches.entries()].map(([model, [caught, escaped]]) => ({ model, caught, escaped, rate: share(caught, caught + escaped) })),
    cells: cellRows,
    recommendations: cellRows.flatMap((c) => recommend(c)),
    escapedDefects: escapes.sort((a, b) => b.at.localeCompare(a.at)),
  };
}
