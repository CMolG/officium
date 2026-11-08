/**
 * The review rework cap (card://JAVA-1443), as the API's `ReviewRework`: the demo reroutes and refuses a card
 * the way the server does, in the same words, so the board shows what the API would.
 */
import type { ReviewReturn, Status } from "../types";
import type { ReviewReturnReason } from "../review-return-types";
import { ApiError } from "../api-error";

/** Send-backs from review in a row before the card escalates; a generic default, not a per-project knob. */
export const REVIEW_REWORK_CAP = 3;

const WORK: readonly Status[] = ["todo", "doing", "ready"];

/** The send-backs from review since the plan was last redone, oldest first. */
export function reviewReworkRounds(returns: readonly ReviewReturn[]): ReviewReturn[] {
  return returns.reduce<ReviewReturn[]>((rounds, entry) => {
    if (entry.to === "refine" || entry.from === "deploy") return [];
    return entry.from === "review" ? [...rounds, entry] : rounds;
  }, []);
}

export const reviewReworkStreak = (returns: readonly ReviewReturn[]): number => reviewReworkRounds(returns).length;

/** `ReviewRework.route`: where a move lands. The send-back that reaches the cap lands in refine instead. */
export function reviewReworkLanding(
  from: Status,
  to: Status,
  prior: readonly ReviewReturn[],
): { to: Status; escalated: boolean } {
  const loop = from === "review" && WORK.includes(to);
  return loop && reviewReworkStreak(prior) + 1 >= REVIEW_REWORK_CAP
    ? { to: "refine", escalated: true }
    : { to, escalated: false };
}

/** `ReviewRework.requireRoomToReview`: an arrival in review for a card at the cap is refused (409). */
export function requireRoomToReview(to: Status, prior: readonly ReviewReturn[]): void {
  if (to === "review" && reviewReworkStreak(prior) >= REVIEW_REWORK_CAP) {
    throw new ApiError(
      "review_rework_cap",
      `This card went back from review ${REVIEW_REWORK_CAP} times: redo its plan or split it in refine first`,
      409,
    );
  }
}

/** `ReviewRework.escalation`: the block the third send-back's findings carry. */
export function reviewReworkEscalation(prior: readonly ReviewReturn[], reasons: readonly ReviewReturnReason[]): string {
  const rounds = reviewReworkRounds(prior);
  const recurring = [...new Set(reasons.filter((reason) => rounds.some((round) => round.reasons.includes(reason))))];
  const named = recurring.length === 0
    ? "No reason recurred across the rounds: the findings differ each time, so the plan is what is unclear."
    : `Recurring reasons: ${recurring.join(", ")}.`;
  return `## Escalated to refine\n\nThe card went back from review ${rounds.length + 1} times in a row without passing `
    + `(review rework cap ${REVIEW_REWORK_CAP}, card://JAVA-1443). ${named} `
    + "Redo the plan or split the card before it goes back to work.";
}
