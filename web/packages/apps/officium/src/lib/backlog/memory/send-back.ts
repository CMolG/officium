import type { Actor, Card, Status } from "../types";
import type { CheckedReturn } from "../review-returns";
import { newId } from "../format";
import { now } from "./rules";
import type { ProjectRecord } from "./sample-record";

/**
 * What the API writes with a send-back move (card://JAVA-1416): the findings as the mover's comment, and the
 * log entry that points at it. The comment text is `SendBackWriter`'s: a header line, then the findings.
 */
export function writeSendBack(
  record: ProjectRecord,
  card: Card,
  from: Status,
  checked: CheckedReturn,
  actor: Actor,
  escalation: string | null,
) {
  const at = now();
  const detail = record.details.get(card.id);
  const commentId = newId(`${card.id}-comment`);
  detail?.comments.push({
    id: commentId,
    cardId: card.id,
    author: actor,
    text: `Sent back to ${card.status}: ${checked.reasons.join(", ")}\n\n${checked.findings}${escalation ? `\n\n${escalation}` : ""}`,
    createdAt: at,
    updatedAt: at,
    parentId: null,
  });
  card.reviewReturns = [
    ...(card.reviewReturns ?? []),
    { id: newId(`${card.id}-return`), at, by: actor, role: checked.role, from, to: card.status, reasons: checked.reasons, commentId },
  ];
}
