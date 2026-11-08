import type { BacklogRepository } from "./repository";
import type { Meta } from "./types";

/**
 * `meta.states`, read once per repository and shared (architecture.md, client fetch discipline):
 * it is the deployment's fixed vocabulary, so it does not change while a page lives. Kept per
 * repository, like the role matrix, so the Theater's in-memory demo never shares answers with the
 * real API. A failed read is not kept: the next reader asks again.
 */
const reads = new WeakMap<BacklogRepository, Promise<Meta>>();

export function readMeta(repository: BacklogRepository): Promise<Meta> {
  let pending = reads.get(repository);
  if (!pending) {
    pending = repository.getMeta();
    reads.set(repository, pending);
    pending.catch(() => reads.delete(repository));
  }
  return pending;
}
