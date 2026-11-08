import type { BacklogRepository } from "./repository";
import { MemoryDocComments } from "./memory/doc-comments";
import { SAMPLE_PROJECT_ID, buildSampleRecord } from "./memory/sample-record";
import { YOU } from "./memory-seed";

/**
 * In-memory `BacklogRepository`, freshly written (not a copy of the concept's
 * `backlog-mocks.ts` -- see `.harness/rules/external-providers.md`): a deterministic seed for a
 * fictional software team's backlog, in English, plus the folders/projects/members model JDB-225
 * adds and the executor/links/live-update model JDB-239 adds.
 *
 * JDB-226 swaps this for an implementation that calls `/officium/v1/**`; nothing outside this
 * file may import it directly except through the `BacklogRepository` type, which is what makes
 * that swap a one-file change.
 */
export class InMemoryBacklogRepository extends MemoryDocComments implements BacklogRepository {
  constructor() {
    super();
    const sample = buildSampleRecord(this.matrixOf);
    this.records.set(sample.project.id, sample);
    this.seedAgentWork(sample.project.id);
    this.seedSprints(sample.project.id);
  }
}

/** One shared instance per browser tab -- mirrors a session-scoped mock, not a global singleton
 *  across users, which is fine while everything runs client-side on mocks (JDB-223/225/239). */
let sharedInstance: InMemoryBacklogRepository | null = null;

export function getSharedBacklogRepository(): InMemoryBacklogRepository {
  if (!sharedInstance) sharedInstance = new InMemoryBacklogRepository();
  return sharedInstance;
}

export const DEFAULT_PROJECT_ID = SAMPLE_PROJECT_ID;

export { YOU as CURRENT_USER };
