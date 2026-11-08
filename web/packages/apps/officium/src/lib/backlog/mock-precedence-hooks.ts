import type { OfficiumMockHooks } from "./mock-test-hooks";
import type { getSharedBacklogRepository } from "./memory-repository";

/** Marks a card as ranked and plants its precedence history (JAVA-1728), apart so `installMockTestHooks` stays under its bars. */
export function precedenceMockHooks(
  repository: ReturnType<typeof getSharedBacklogRepository>,
): Pick<OfficiumMockHooks, "simulateCardPrecedence" | "simulateCardPrecedenceActivity"> {
  return {
    simulateCardPrecedenceActivity: (projectId, cardKey, lines) => repository.setCardPrecedenceActivity(projectId, cardKey, lines),
    simulateCardPrecedence: (projectId, keyOrId, precedence) => repository.setCardPrecedence(projectId, keyOrId, precedence),
  };
}
