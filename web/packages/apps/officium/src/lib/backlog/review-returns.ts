/**
 * Sending a card back from review or deploy (card://JAVA-1416): the closed list of reasons `meta.states`
 * serves, and the API's `ReviewReturns`, which the in-memory backend applies so the demo refuses what the
 * server does, in the same words.
 */
import type { Actor, Card, Status } from "./types";
import type { ReviewReturnInput, ReviewReturnReason, ReviewReturnReasonEntry } from "./review-return-types";

/** `ReviewReturnReason.java`, in its order: what the demo's `meta.states` serves. */
export const REVIEW_RETURN_REASONS: readonly ReviewReturnReasonEntry[] = [
  { id: "acceptance-unmet", label: "Acceptance unmet", hint: "A criterion of the card is not met." },
  { id: "contract-unmet", label: "Contract unmet", hint: "The category's exit lines are missing or untrue." },
  { id: "tests-missing-or-red", label: "Tests missing or red", hint: "The change has no test pinning it, or a test is red." },
  { id: "plan-not-followed", label: "Plan not followed", hint: "The work departs from the card's action plan." },
  { id: "regression", label: "Regression", hint: "The change breaks something that worked." },
  { id: "design-or-ux", label: "Design or UX", hint: "The design, copy or interaction needs to change." },
  { id: "scope-drift", label: "Scope drift", hint: "The change does more, or less, than the card asked." },
  { id: "integration-failed", label: "Integration failed", hint: "The branch does not merge, or is red once merged." },
  { id: "other", label: "Other", hint: "None of these: the findings say what was wrong." },
];

export const REVIEW_RETURN_FINDINGS_MAX = 20000;

const FROM: readonly Status[] = ["review", "deploy"];
const TO: readonly Status[] = ["refine", "todo", "doing", "ready"];

/** `ReviewReturns.isSendBack`: a move from review or deploy back to a work phase. */
export const isSendBack = (from: Status, to: Status): boolean => FROM.includes(from) && TO.includes(to);

export interface ReviewReturnRefusal {
  code: string;
  message: string;
  status: 400;
}

export interface CheckedReturn {
  reasons: ReviewReturnReason[];
  findings: string;
  role: string | null;
}

const refused = (code: string, message: string) => ({ refusal: { code, message, status: 400 as const } });
const wires = REVIEW_RETURN_REASONS.map((r) => r.id).join(", ");

/** `ReviewReturns.require`: a refusal, or the checked send-back (null when the move is not one). */
export function reviewReturnOutcome(
  card: Pick<Card, "status">,
  to: Status,
  input: ReviewReturnInput | undefined,
  by: Actor["kind"],
  eligibleRoles: readonly string[],
): { refusal: ReviewReturnRefusal } | { checked: CheckedReturn | null } {
  if (!isSendBack(card.status, to)) {
    if (input) {
      return refused("review_return_without_send_back", "`reviewReturn` goes with a send-back, a move from review or deploy back to refine, to do, doing or ready: drop it, or send the card back");
    }
    return { checked: null };
  }
  if (!input) {
    return refused("review_return_required", `Sending a card back from ${card.status} needs a reason (${wires}) and the findings: give \`reviewReturn\``);
  }
  if (!input.reasons?.length) return refused("review_return_reason_required", `A send-back needs at least one reason (${wires})`);
  const seen: ReviewReturnReason[] = [];
  for (const raw of input.reasons) {
    const reason = REVIEW_RETURN_REASONS.find((r) => r.id === String(raw).trim());
    if (!reason) return refused("review_return_reason_invalid", `Unknown send-back reason: ${raw}. One of: ${wires}`);
    if (seen.includes(reason.id)) return refused("review_return_reason_repeated", `The reason ${reason.id} is given twice: name each once`);
    seen.push(reason.id);
  }
  const findings = input.findings?.trim() ?? "";
  if (!findings) return refused("review_return_findings_required", "Say what was wrong in `findings`: it is the comment the author reads first");
  if (findings.length > REVIEW_RETURN_FINDINGS_MAX) {
    return refused("review_return_findings_too_long", `A send-back's findings are at most ${REVIEW_RETURN_FINDINGS_MAX} characters; these have ${findings.length}`);
  }
  const hint = eligibleRoles.length ? ` (one of: ${eligibleRoles.join(", ")})` : "";
  const role = input.role?.trim() ?? "";
  if (!role) {
    if (by === "agent") return refused("review_return_role_required", `An agent says the role it reviewed as in \`role\`${hint}`);
    return { checked: { reasons: seen, findings, role: null } };
  }
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(role) || (eligibleRoles.length > 0 && !eligibleRoles.includes(role))) {
    return refused("review_return_role_invalid", `\`role\` is not a role that works this card now${hint}`);
  }
  return { checked: { reasons: seen, findings, role } };
}
