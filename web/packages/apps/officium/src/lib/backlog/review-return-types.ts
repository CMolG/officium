// Send-back wire shapes (card://JAVA-1416), split from types.ts to keep it under its architecture ceiling.
import type { Actor, Category, Status } from "./types";
import type { RejectionInput } from "./rejection";

/** Why a card was sent back from review or deploy: the closed list `meta.states` serves as `reviewReturnReasons`. */
export type ReviewReturnReason =
  | "acceptance-unmet"
  | "contract-unmet"
  | "tests-missing-or-red"
  | "plan-not-followed"
  | "regression"
  | "design-or-ux"
  | "scope-drift"
  | "integration-failed"
  | "other";

/** One reason of the closed list. */
export interface ReviewReturnReasonEntry {
  id: ReviewReturnReason;
  label: string;
  hint: string;
}

/**
 * One send-back, in `Card.reviewReturns` oldest first. `commentId` is the findings comment, null once it is
 * deleted; `role` is the role the mover reviewed as, null for a person who gave none.
 */
export interface ReviewReturn {
  id: string;
  at: string;
  by: Actor;
  role: string | null;
  from: Status;
  to: Status;
  reasons: ReviewReturnReason[];
  commentId: string | null;
}

/** What a send-back from review or deploy sends with its move: the reasons, the findings and the role. */
export interface ReviewReturnInput {
  reasons: ReviewReturnReason[];
  findings: string;
  role?: string;
  /** The engineering rules the work broke, `<dimension>:<rule>` (card://JAVA-1526). */
  ruleViolations?: string[];
}

/** The body of a card move: a move to `rejected` carries `rejection`, a send-back carries `reviewReturn`. */
export interface MoveInput {
  expectedVersion: number;
  status: Status;
  position: number;
  rejection?: RejectionInput;
  reviewReturn?: ReviewReturnInput;
  /** An approval's scorecard: each scored dimension, `observations` and `role` (card://JAVA-1526). */
  qualityScorecard?: Record<string, string>;
  /** The eligible role the mover ran the phase it leaves as, kept with the phase run (card://JAVA-1527). */
  role?: string;
}

/** `metrics.get`'s send-backs of the period (card://JAVA-1416): a return counts once for each reason it names. */
export interface ReviewReturnMetrics {
  total: number;
  byReason: { reason: ReviewReturnReason; count: number }[];
  byCategory: { category: Category | null; count: number }[];
  /** Cards whose first arrival at deploy or done fell in the period, and those never sent back before it. */
  firstTimePass: { passed: number; firstTime: number; share: number | null };
}
