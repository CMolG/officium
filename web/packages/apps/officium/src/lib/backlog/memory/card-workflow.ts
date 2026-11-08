import type { Actor, Card, CardWorkflow, WriteResult } from "../types";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { workflowProblemsUnder } from "../workflow-check";
import { MemoryCardWrites } from "./card-writes";

/**
 * The card's own workflow, as the in-memory repository serves it (JAVA-1592). An agent writes it through `setWorkflow`,
 * as `CardWorkflowService.set` does (JAVA-1591): a workflow that does not fit the card is refused (`workflow_invalid`),
 * a fitting one is stored with the card's version bumped. The board never writes one. A card of a live epic takes none
 * of its own (`epic_workflow`, JAVA-1885): its epic's workflow is written once, with a part per category of its cards.
 */
export class MemoryCardWorkflow extends MemoryCardWrites {
  async setWorkflow(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; workflow: CardWorkflow | null },
    actor: Actor = YOU,
  ): Promise<WriteResult<Card>> {
    const card = this.requireRecord(projectId).cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    const epic = [...this.requireRecord(projectId).cards.values()].find((e) => e.key === card.epic && e.category === "epic");
    if (input.workflow && card.category !== "epic" && epic) {
      throw new ApiError("epic_workflow", `${card.key} is a card of epic ${epic.key}, whose workflow is written once for all `
        + `its cards: set it on ${epic.key}, with a part for this card's category under \`cards\` (card://JAVA-1885).`, 409);
    }
    const problems = workflowProblemsUnder(input.workflow, this.matrixOf(projectId), card.category, card.subtype, card.signals);
    if (problems.length > 0) {
      throw new ApiError("workflow_invalid", problems.map((p) => `${p.phase}: ${p.message}`).join("; "), 400);
    }
    card.workflow = input.workflow;
    this.editCard(card, actor);
    this.emit(projectId, { type: "card.updated", cardId: card.id, cardKey: card.key, version: card.version, actor });
    return { ...card };
  }
}
