import { findNode } from "../docs/doc-tree";
import type { getSharedBacklogRepository } from "./memory-repository";
import { ANA } from "./memory-seed";
import type { OfficiumMockHooks } from "./mock-test-hooks";
import type { Actor } from "./types";

/** The documentation half of the mock hooks: an agent's and another member's page writes (JAVA-793), an agent's move
 *  (JAVA-792), an agent's layout write (JAVA-795) and the owner's room for pages (JAVA-801), apart so
 *  `installMockTestHooks` stays under the function bar. */
export function docMockHooks(
  repository: ReturnType<typeof getSharedBacklogRepository>,
  agent: Actor,
): Pick<
  OfficiumMockHooks,
  | "simulateMemberDocUpsert"
  | "simulateAgentDocUpsert"
  | "simulateAgentDocMove"
  | "simulateAgentDocNodeUpdate"
  | "readDoc"
  | "simulateDocAllowance"
  | "simulateAgentDocComment"
  | "readDocComments"
  | "setDocStorageFull"
> {
  return {
    simulateDocAllowance(bytes) {
      repository.setDocAllowance(bytes);
    },
    readDoc(projectId, path) {
      return repository.getDoc(projectId, path);
    },
    simulateAgentDocComment(projectId, path, input) {
      return repository.addDocComment(projectId, path, input, agent);
    },
    readDocComments(projectId, path) {
      return repository.listDocComments(projectId, path, "all");
    },
    setDocStorageFull(projectId, full) {
      repository.setDocStorageFull(projectId, full);
    },
    async simulateMemberDocUpsert(projectId, path, input) {
      await repository.upsertDoc(projectId, path, input, ANA);
    },
    async simulateAgentDocUpsert(projectId, path, input) {
      const current = await repository.getDoc(projectId, path).catch(() => null);
      await repository.upsertDoc(projectId, path, { ...input, expectedVersion: current?.version }, agent);
    },
    async simulateAgentDocMove(projectId, path, to) {
      await repository.moveDoc(projectId, path, { to });
    },
    async simulateAgentDocNodeUpdate(projectId, path, input) {
      const node = findNode((await repository.getDocTree(projectId)).collections, path);
      await repository.updateDocNode(projectId, path, { ...input, expectedVersion: node?.version });
    },
  };
}
