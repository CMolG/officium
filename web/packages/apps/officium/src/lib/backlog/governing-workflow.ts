import type { Card, CardWorkflow, WorkflowProblem } from "./types";

/** What governs a card's phases (JAVA-1885), as `GoverningWorkflow` on the server. */
export interface Governing {
  workflow: CardWorkflow | null;
  /** The key of the epic whose workflow governs the card; null when its own does. */
  from: string | null;
  /** The epic's workflow has no part for the card's row: the one problem the epic's part can have before any pick. */
  problems: WorkflowProblem[];
}

/** The row of the role matrix a card reads: a ux-ui spike has its own. */
export function rowOf(card: Pick<Card, "category" | "subtype">): string | null {
  return card.category === "spike" && card.subtype === "ux-ui" ? "spike/ux-ui" : card.category;
}

/**
 * `GoverningWorkflow.of` on the server: an epic's workflow is written once for all its cards, so a card of a live epic
 * whose workflow is written is governed by that workflow's part for its row, never by its own. Any other card (an
 * epic, one in no epic or under a label, one whose epic has no workflow yet) is governed by its own.
 */
export function governingWorkflow(
  card: Pick<Card, "category" | "subtype" | "epic">,
  own: CardWorkflow | null | undefined,
  epic: Pick<Card, "key" | "category" | "workflow"> | undefined,
): Governing {
  if (card.category === "epic" || !epic || epic.category !== "epic" || !epic.workflow) {
    return { workflow: own ?? null, from: null, problems: [] };
  }
  const row = rowOf(card);
  const part = row ? epic.workflow.cards?.[row] : undefined;
  if (part) return { workflow: { version: 1, phases: part }, from: epic.key, problems: [] };
  const message = row
    ? `its epic ${epic.key}'s workflow has no part for ${row} cards (add one there: cards.setWorkflow on ${epic.key})`
    : `the card has no category, and its epic ${epic.key}'s workflow covers its cards by category (set the category first)`;
  return { workflow: null, from: epic.key, problems: [{ phase: "document", message }] };
}
