import type { OfficiumMockHooks } from "./mock-test-hooks";
import type { getSharedBacklogRepository } from "./memory-repository";
import type { Actor } from "./types";

/** The agent's card writes of the mock hooks (JAVA-1592), apart so `installMockTestHooks` stays under the function bar. */
export function cardAgentMockHooks(
  repository: ReturnType<typeof getSharedBacklogRepository>,
  agent: Actor,
): Pick<OfficiumMockHooks, "simulateAgentUpdate" | "simulateAgentSetWorkflow"> {
  return {
    async simulateAgentUpdate(projectId, cardKey, patch) {
      const card = await repository.getCard(projectId, cardKey);
      await repository.updateCard(projectId, card.id, { expectedVersion: card.version, ...patch }, agent);
    },
    // Mirrors `cards.setWorkflow` (JAVA-1591), as an agent: the workflow is stored only when it fits the card.
    async simulateAgentSetWorkflow(projectId, cardKey, workflow) {
      const card = await repository.getCard(projectId, cardKey);
      await repository.setWorkflow(projectId, card.id, { expectedVersion: card.version, workflow }, agent);
    },
  };
}
