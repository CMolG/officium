import type { Card, CardRejection, RejectionReasonEntry, Status } from "./types";

/**
 * Rejecting a card (card://JAVA-1415): the closed list of reasons `meta.states` serves, and the API's
 * `RejectionRules`, which the in-memory backend applies so the demo refuses what the server does, in
 * the same words.
 */

/** `RejectionReason.java`, in its order: what the demo's `meta.states` serves. */
export const REJECTION_REASONS: readonly RejectionReasonEntry[] = [
  { id: "not-needed", label: "Not needed", hint: "Nobody needs the outcome any more, or nobody ever did.", namesCard: false },
  { id: "duplicate", label: "Duplicate", hint: "Another card already asks for the same thing: name it.", namesCard: true },
  { id: "superseded", label: "Superseded", hint: "Another card replaced this one: name it.", namesCard: true },
  { id: "wrong-split", label: "Wrong split", hint: "It should have been a step of another card: name it.", namesCard: true },
  { id: "infeasible", label: "Infeasible", hint: "It cannot be done as asked: a spike, a limit or a cost proved it.", namesCard: false },
  { id: "other", label: "Other", hint: "None of these: the note says what was wrong.", namesCard: false },
];

export const REJECTION_NOTE_MAX = 2000;

/** The reason as a person reads it, with the card it names: "Duplicate of JAVA-99", "Superseded by JAVA-7". */
export function rejectionLine(rejection: CardRejection): string {
  if (!rejection.card) return rejection.label;
  switch (rejection.reason) {
    case "duplicate": return `Duplicate of ${rejection.card}`;
    case "superseded": return `Superseded by ${rejection.card}`;
    case "wrong-split": return `Wrong split: a step of ${rejection.card}`;
    default: return `${rejection.label} · names ${rejection.card}`;
  }
}

/** What a move to rejected sends: `card` is the key of the card the reason names. */
export interface RejectionInput {
  reason: string;
  note: string;
  card?: string;
}

export interface RejectionRefusal {
  code: string;
  message: string;
  status: 400 | 409;
}

const refused = (code: string, message: string, status: 400 | 409 = 400) => ({ refusal: { code, message, status } });

/**
 * `RejectionRules.require`: a refusal, or the rejection the card keeps once moved (null off rejected).
 *
 * @param liveKey the key of a live card of the project by key, or null when there is none
 */
export function rejectionOutcome(
  card: Pick<Card, "key" | "status" | "rejection">,
  to: Status,
  input: RejectionInput | undefined,
  enabled: boolean,
  liveKey: (key: string) => string | null,
): { refusal: RejectionRefusal } | { rejection: CardRejection | null } {
  const from = card.status;
  if (input && to !== "rejected") {
    return refused("rejection_without_reject", "A rejection goes with a move to rejected: drop `rejection`, or move the card to rejected");
  }
  if (from === "rejected" && to !== "rejected" && to !== "refine") {
    return refused("rejected_reopens_to_refine", "A rejected card reopens in refine, where its plan is checked again before any work: move it to refine", 409);
  }
  if (to !== "rejected") return { rejection: null };
  if (from === "rejected" && !input) return { rejection: card.rejection ?? null };
  if (from === "done") return refused("card_done_not_rejectable", "A completed card shipped, so it isn't rejected: undo its work with a new card", 409);
  if (!enabled) return refused("rejection_disabled", "Rejecting cards is not turned on here yet. Leave the card where it is, with a comment naming why it would be rejected", 409);
  const wires = REJECTION_REASONS.map((r) => r.id).join(", ");
  if (!input?.reason?.trim()) return refused("rejection_reason_required", `Rejecting a card needs a reason (${wires}) and a note saying what was wrong`);
  const reason = REJECTION_REASONS.find((r) => r.id === input.reason.trim());
  if (!reason) return refused("rejection_reason_invalid", `Unknown rejection reason: ${input.reason}. One of: ${wires}`);
  const note = input.note?.trim() ?? "";
  if (!note) return refused("rejection_note_required", "Say what was wrong in `note`: it is what a later reading of the rejected cards learns from");
  if (note.length > REJECTION_NOTE_MAX) return refused("rejection_note_too_long", `A rejection's note is at most ${REJECTION_NOTE_MAX} characters; this one has ${note.length}`);
  const named = input.card?.trim();
  if (!named) {
    if (reason.namesCard) return refused("rejection_card_required", `A rejection as ${reason.id} names the card it points to: give its key in \`card\``);
    return { rejection: { reason: reason.id, label: reason.label, note, card: null } };
  }
  const key = liveKey(named);
  if (!key) return refused("rejection_card_invalid", `\`card\` names no live card of this project: ${named}`);
  if (key === card.key) return refused("rejection_card_invalid", "A card can't name itself as the reason it was rejected");
  return { rejection: { reason: reason.id, label: reason.label, note, card: key } };
}
