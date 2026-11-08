// Metrics wire shapes, split from types.ts (JAVA-1386) to keep it under its architecture ceiling.
import type { Category, RejectionReason, Status } from "./types";
import type { ReviewReturnMetrics } from "./review-return-types";
import type { ProfileMetrics } from "./profile-metrics-types";

export interface MetricsPeriod {
  /** `yyyy-mm-dd`, inclusive. */
  from: string;
  to: string;
  sprintId: string | null;
}

export interface TokenCounts {
  tokensIn: number;
  cachedTokensIn: number;
  reasoningTokens: number;
  tokensOut: number;
}

/** How much of the period's work recorded tokens (card://JAVA-1588); absent from an API older than it. */
export interface TokenCoverage {
  /** Deliveries in the period, and how many of their cards recorded tokens, all time. */
  deliveries: number;
  covered: number;
  deliveredShare: number | null;
  /** Agent hours in the period (manual hours left out), and how many of them carry tokens. */
  agentHours: number;
  agentHoursWithTokens: number;
  hoursShare: number | null;
  /** Below this share of either, the per-card figures cover only what recorded tokens. */
  warnBelow: number;
}

/** The estimated API cost of the period's recorded usage (card://JAVA-1777): an estimate at list prices, not a bill.
 *  `usd` is null when no row could be priced; `unpricedRows` counts the rows left out, `unpricedModels` names them.
 *  Absent from an API older than it. */
export interface TokenCost {
  usd: number | null;
  unpricedRows: number;
  unpricedModels: string[];
}

export interface ContributionMetric {
  who: string;
  kind: "person" | "agent";
  delivered: number;
  hours: number;
  /** The estimated API cost of this contributor's recorded usage, or null (JAVA-1777). */
  usd?: number | null;
  unpricedRows?: number;
}

export interface CategoryMetric {
  category: Category | null;
  delivered: number;
  /** First move into `doing` -> first arrival at `review` or later. `null` with no such card. */
  meanCycleHours: number | null;
  /** Time entries of those cards, all time. `null` with nothing logged. */
  meanLoggedHours: number | null;
}

export interface LongestOpenCard {
  key: string;
  title: string;
  status: Status;
  category: Category | null;
  ageHours: number;
  inStatusHours: number;
}

export interface Metrics {
  period: MetricsPeriod;
  /** Cards that FIRST reached review/deploy/done inside the period. */
  delivered: number;
  /** `refine` + `test` + `work` split the same total by what it went to (JAVA-245). */
  hours: { total: number; imputed: number; manual: number; refine: number; test: number; work: number };
  /** What agents' reported sessions spent in the period, by model, most output first. `perDelivery`: the average over
   *  the covered deliveries (`tokenCoverage`), null when none is covered; absent from an API older than it. */
  tokens: TokenCounts & {
    byModel: (TokenCounts & { model: string; usd?: number | null })[];
    perDelivery?: TokenCounts | null;
    cost?: TokenCost;
  };
  /** Absent from an API older than JAVA-1588. */
  tokenCoverage?: TokenCoverage;
  contributions: ContributionMetric[];
  byCategory: CategoryMetric[];
  /** Not yet deploy/done, nor rejected, oldest first, at most 10. */
  longestOpen: LongestOpenCard[];
  /** The cards rejected now whose last move into rejected falls in the period (card://JAVA-1415). */
  rejected: RejectedMetrics;
  /** The send-backs of the period and the first-time pass share (card://JAVA-1416). */
  reviewReturns: ReviewReturnMetrics;
  /** By AI work profile (card://JAVA-1527); absent from an API older than it. */
  profiles?: ProfileMetrics;
}

/** By reason and by category, most first; a delivered card later rejected left `delivered`. */
export interface RejectedMetrics {
  total: number;
  byReason: { reason: RejectionReason; count: number }[];
  byCategory: { category: Category | null; count: number }[];
}
