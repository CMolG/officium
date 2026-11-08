"use client";

import { useEffect, useSyncExternalStore } from "react";
import { onForeground } from "@javadaba/sdk/platform";

import { getBacklogRepository } from "./get-repository";
import type { BacklogRepository } from "./repository";
import type { ChangeEvent, Project } from "./types";

/**
 * The workspace's project list, held ONCE for every surface that shows it (JAVA-125): the
 * sidebar, the board's project switcher, the projects home and Organization. Each used to fetch
 * its own copy, so a project renamed or re-iconed in the board's dialog stayed stale in the
 * sidebar until a reload -- nothing told the other copies. Now a save publishes into this store,
 * and every refetch any surface makes lands here too, sharing one request when they coincide
 * (architecture.md, client fetch discipline).
 *
 * Once PER REPOSITORY (JAVA-205): the Theater plays the real `Board` over its own in-memory
 * repository, and a single store read through `getBacklogRepository()` made that demo ask the
 * real API for the mock's projects. Every `/app` surface passes the global repository (the
 * default), so they still share one list.
 */
interface Store {
  projects: Project[] | null;
  inFlight: Promise<Project[]> | null;
  listeners: Set<() => void>;
  subscribe: (listener: () => void) => () => void;
  snapshot: () => Project[] | null;
}

const stores = new WeakMap<BacklogRepository, Store>();

function storeOf(repository: BacklogRepository): Store {
  let store = stores.get(repository);
  if (!store) {
    const created: Store = {
      projects: null,
      inFlight: null,
      listeners: new Set(),
      subscribe: (listener) => {
        created.listeners.add(listener);
        return () => created.listeners.delete(listener);
      },
      snapshot: () => created.projects,
    };
    stores.set(repository, created);
    store = created;
  }
  return store;
}

function set(store: Store, next: Project[]) {
  store.projects = next;
  for (const listener of store.listeners) listener();
}

/** Refetches the list. Callers that coincide share the one request. */
export function refreshProjectList(repository: BacklogRepository = getBacklogRepository()): Promise<Project[]> {
  const store = storeOf(repository);
  if (!store.inFlight) {
    store.inFlight = repository
      .listProjects()
      .then(
        (list) => {
          set(store, list);
          return list;
        },
        (err: unknown) => {
          // A first load that fails still resolves the surfaces waiting on it (an empty sidebar,
          // not an endless "Loading…"); a later failure keeps what was already shown.
          if (store.projects === null) set(store, []);
          throw err;
        },
      )
      .finally(() => {
        store.inFlight = null;
      });
  }
  return store.inFlight;
}

/** A project this tab just saved: every surface shows it at once, without a round trip. The list
 *  holds live projects only (`listProjects()`'s default), so an archived one leaves it. */
export function publishProject(project: Project, repository: BacklogRepository = getBacklogRepository()) {
  const store = storeOf(repository);
  if (store.projects === null) return;
  const others = store.projects.filter((p) => p.id !== project.id);
  set(store, project.archivedAt ? others : [...others, project].sort((a, b) => a.name.localeCompare(b.name)));
}

/** A project this tab just deleted: every surface drops it at once (JAVA-1554). */
export function unpublishProject(projectId: string, repository: BacklogRepository = getBacklogRepository()) {
  const store = storeOf(repository);
  if (store.projects !== null) set(store, store.projects.filter((p) => p.id !== projectId));
}

/** A background refetch: on failure what was shown stays, and the next event or focus retries. */
function revalidate(repository: BacklogRepository) {
  refreshProjectList(repository).catch(() => undefined);
}

const PROJECT_EVENTS: ReadonlySet<ChangeEvent["type"]> = new Set(["project.updated", "project.archived", "project.unarchived"]);

/**
 * The list, `null` until the first load. Mounting revalidates it in the background (what is
 * cached paints first). `liveProjectId` is the project in view: its live channel's project events
 * refetch the list, so an agent's `projects.update` shows as it happens -- the repository shares
 * one stream per project, so this opens nothing the board has not already opened. Coming back to
 * the tab refetches too, which is what catches a change made in another tab to another project.
 */
export function useProjectList(
  liveProjectId?: string,
  repository: BacklogRepository = getBacklogRepository(),
): Project[] | null {
  const store = storeOf(repository);
  const list = useSyncExternalStore(store.subscribe, store.snapshot, () => null);

  useEffect(() => {
    revalidate(repository);
    return onForeground(() => revalidate(repository));
  }, [repository]);

  useEffect(() => {
    if (!liveProjectId) return;
    return repository.subscribe(liveProjectId, (event) => {
      if (PROJECT_EVENTS.has(event.type)) revalidate(repository);
    });
  }, [liveProjectId, repository]);

  return list;
}
