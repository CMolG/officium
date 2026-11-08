import type { Category, Executor, Priority, RejectionReason, ReviewReturnReason, RunState, Status } from "./types";
import { ALL_STATUSES, PRIORITY_CONFIG, STATUS_CONFIG } from "./status-config";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./category-config";
import { REJECTION_REASONS } from "./rejection";
import { REVIEW_RETURN_REASONS } from "./review-returns";

/**
 * Every way a value is written in OQL: its wire id and its label, plus the Jira words people already
 * know. The twin of `JqlWords.java` (contract JDB-270); split out of `jql.ts` to keep it under its
 * size bar (card://JAVA-1415).
 */

export const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");

/**
 * Every way a status is written: its id and its label. "Done" and "Completed" are Completed's own
 * id and label since 2026-09-23 -- until then they were aliases of Deploy, the last column.
 */
export const STATUS_WORDS = new Map<string, Status>(
  ALL_STATUSES.flatMap((id) => [[norm(id), id], [norm(STATUS_CONFIG[id].label), id]] as const),
);

/** Ids, labels, and the names the user gave some of them ("Chore / Routine", "QA / Testing"). */
export const CATEGORY_WORDS = new Map<string, Category>([
  ...CATEGORY_ORDER.flatMap((id) => [[norm(id), id], [norm(CATEGORY_CONFIG[id].label), id]] as const),
  ["story", "userStory"],
  ["improvement", "enhancement"],
  ["techdebt", "technicalDebt"],
  ["devops", "infrastructure"],
  ["qa", "testing"],
  ["chore", "routine"],
  ["docs", "documentation"],
]);

/** Ids, labels, and Jira's names for the two ends ("Highest", "Lowest"). */
export const PRIORITY_WORDS = new Map<string, Priority>([
  ...(Object.keys(PRIORITY_CONFIG) as Priority[]).flatMap(
    (id) => [[norm(id), id], [norm(PRIORITY_CONFIG[id].label), id]] as const,
  ),
  ["highest", "superHigh"],
  ["lowest", "superLow"],
]);

export const EXECUTOR_WORDS = new Map<string, Executor>([
  ["ai", "ai"], ["agent", "ai"], ["human", "human"], ["person", "human"],
]);

/** A rejection reason by its id or its label: `not-needed` and "Not needed" alike. */
export const REJECTION_WORDS = new Map<string, RejectionReason>(
  REJECTION_REASONS.flatMap((r) => [[norm(r.id), r.id], [norm(r.label), r.id]] as const),
);

/** A send-back reason by its id or its label (card://JAVA-1416). */
export const RETURN_REASON_WORDS = new Map<string, ReviewReturnReason>(
  REVIEW_RETURN_REASONS.flatMap((r) => [[norm(r.id), r.id], [norm(r.label), r.id]] as const),
);

export const RUN_STATES: RunState[] = ["idle", "running", "completed", "failed"];

/** Higher = more urgent, so `priority > Medium` reads the way it does in Jira. */
export const priorityRank = (p: Priority) => 6 - PRIORITY_CONFIG[p].weight;
