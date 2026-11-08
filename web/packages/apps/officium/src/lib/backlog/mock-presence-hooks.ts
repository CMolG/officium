import type { OfficiumMockHooks } from "./mock-test-hooks";
import type { getSharedBacklogRepository } from "./memory-repository";
import { precedenceMockHooks } from "./mock-precedence-hooks";

/** Other people on a documentation page (JAVA-802), apart so `installMockTestHooks` stays under the function bar. */
export function presenceMockHooks(
  repository: ReturnType<typeof getSharedBacklogRepository>,
): Pick<OfficiumMockHooks, "seedDocPresence" | "clearDocPresence" | "readDocPresence" | "simulateCardPrecedence" | "simulateCardPrecedenceActivity"> {
  return {
    ...precedenceMockHooks(repository),
    readDocPresence: (projectId, path) => repository.docPresence.view(projectId, path),
    seedDocPresence: (projectId, path, person) => repository.docPresence.seed(projectId, path, person),
    clearDocPresence: (projectId, path, accountId) => repository.docPresence.remove(projectId, path, accountId),
  };
}
