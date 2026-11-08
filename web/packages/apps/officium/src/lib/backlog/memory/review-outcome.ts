import type { Actor, Card, Status } from "../types";
import type { MoveInput } from "../review-return-types";
import { isApproval, type ReviewOutcome } from "../quality-lineage";
import { isSendBack } from "../review-returns";
import { newId } from "../format";
import { now } from "./rules";

/**
 * What the API's `ReviewExitWriter` logs once a move out of review committed (card://JAVA-1526): an approval with
 * its scorecard, or a send-back with the rules it broke, next to the send-back entry written just before.
 */
export function recordReviewOutcome(card: Card, from: Status, input: MoveInput, actor: Actor) {
  const sendBack = isSendBack(from, card.status);
  if (!sendBack && !isApproval(from, card.status, card.category)) return;
  const { observations, role, ...scores } = input.qualityScorecard ?? {};
  const outcome: ReviewOutcome = {
    id: newId(`${card.id}-outcome`),
    at: now(),
    by: actor,
    role: (sendBack ? input.reviewReturn?.role : role) ?? null,
    from,
    to: card.status,
    verdict: sendBack ? "sent_back" : "approved",
    ruleViolations: sendBack ? input.reviewReturn?.ruleViolations ?? [] : [],
    scorecard: sendBack ? {} : (scores as ReviewOutcome["scorecard"]),
    observations: sendBack ? null : observations ?? null,
    reviewReturnId: sendBack ? card.reviewReturns?.at(-1)?.id ?? null : null,
  };
  card.reviewOutcomes = [...(card.reviewOutcomes ?? []), outcome];
}
