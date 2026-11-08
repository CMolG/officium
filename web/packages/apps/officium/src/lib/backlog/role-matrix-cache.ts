import type { BacklogRepository } from "./repository";
import type { RoleMatrixView } from "./types";

/**
 * A project's role matrix, read once and shared (JAVA-517 review): the roles index shows one row
 * per project and each row reads that project's matrix, so without this every visit sent one
 * uncached `GET /projects/{id}/role-matrix` per project (architecture.md, client fetch
 * discipline). Same shape as `me()`/`wallet()` in `@javadaba/account`: a short TTL, one request
 * shared by readers that coincide, and an explicit forget for whoever knows it changed.
 *
 * Kept per repository, like the project list: the Theater's in-memory demo must not share
 * answers with the real API.
 */
const TTL_MS = 10_000;

interface Entry {
  last: { view: RoleMatrixView; at: number } | null;
  inFlight: Promise<RoleMatrixView> | null;
  /** Bumped by every forget or publish; a read that started under an older one is not kept. */
  generation: number;
}

const caches = new WeakMap<BacklogRepository, Map<string, Entry>>();

function entryOf(repository: BacklogRepository, projectId: string): Entry {
  let byProject = caches.get(repository);
  if (!byProject) {
    byProject = new Map();
    caches.set(repository, byProject);
  }
  let entry = byProject.get(projectId);
  if (!entry) {
    entry = { last: null, inFlight: null, generation: 0 };
    byProject.set(projectId, entry);
  }
  return entry;
}

/** The project's matrix: cached for a few seconds, and one request for readers that coincide. */
export function readRoleMatrix(repository: BacklogRepository, projectId: string): Promise<RoleMatrixView> {
  const entry = entryOf(repository, projectId);
  if (entry.last && Date.now() - entry.last.at < TTL_MS) return Promise.resolve(entry.last.view);
  if (entry.inFlight) return entry.inFlight;
  const startedIn = entry.generation;
  const request = repository.getRoleMatrix(projectId).finally(() => {
    if (entry.inFlight === request) entry.inFlight = null;
  });
  entry.inFlight = request;
  request.then(
    (view) => {
      if (startedIn === entry.generation) entry.last = { view, at: Date.now() };
    },
    () => undefined,
  );
  return request;
}

/** Drops the cached matrix. Call it BEFORE re-reading after hearing it changed elsewhere. */
export function forgetRoleMatrix(repository: BacklogRepository, projectId: string) {
  const entry = entryOf(repository, projectId);
  entry.generation += 1;
  entry.inFlight = null;
  entry.last = null;
}

/** A matrix this tab just saved (or a conflict's current one): every reader gets it with no round trip. */
export function publishRoleMatrix(repository: BacklogRepository, projectId: string, view: RoleMatrixView) {
  const entry = entryOf(repository, projectId);
  entry.generation += 1;
  entry.inFlight = null;
  entry.last = { view, at: Date.now() };
}
