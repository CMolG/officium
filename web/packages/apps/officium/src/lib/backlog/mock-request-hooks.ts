import type { OfficiumMockHooks } from "./mock-test-hooks";
import type { getSharedBacklogRepository } from "./memory-repository";
import type { Actor } from "./types";

/** The "Waiting for you" half of the mock hooks (JAVA-1122), apart so `installMockTestHooks` stays under the function bar. */
export function requestMockHooks(
  repository: ReturnType<typeof getSharedBacklogRepository>,
  agent: Actor,
): Pick<OfficiumMockHooks, "simulateAgentRequestAction" | "simulateAgentCloseRequest" | "simulateRequestAnswered" | "readRequests"> {
  return {
    simulateAgentRequestAction: (projectId, cardKey, input) => repository.openRequest(projectId, cardKey, input, agent),
    simulateAgentCloseRequest: (projectId, cardKey) => repository.closeRequest(projectId, cardKey, agent),
    simulateRequestAnswered: async (projectId, requestId, answer) => void (await repository.answerRequest(projectId, requestId, answer)),
    readRequests: (projectId) => repository.listRequests(projectId),
  };
}
