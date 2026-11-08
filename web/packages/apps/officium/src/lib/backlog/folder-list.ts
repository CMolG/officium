"use client";

import { useEffect, useSyncExternalStore } from "react";
import { onForeground } from "@javadaba/sdk/platform";

import { getBacklogRepository } from "./get-repository";
import type { Folder } from "./types";

/**
 * The workspace's folder list, held once for the two surfaces that show it (JAVA-52): the
 * sidebar's tree and the projects home. A folder created on the home has to appear in the tree
 * at once, and both mount together on `/app`, so they share one request -- the same shape as
 * `project-list.ts`, minus the live channel (folders have no change events).
 */
let folders: Folder[] | null = null;
let inFlight: Promise<Folder[]> | null = null;
const listeners = new Set<() => void>();

function set(next: Folder[]) {
  folders = next;
  for (const listener of listeners) listener();
}

/** Refetches the list. Callers that coincide share the one request. */
export function refreshFolderList(): Promise<Folder[]> {
  if (!inFlight) {
    inFlight = getBacklogRepository()
      .listFolders()
      .then(
        (list) => {
          set(list);
          return list;
        },
        (err: unknown) => {
          // Same as the project list: a failed first load settles into "no folders", not an
          // endless "Loading…"; a later failure keeps what was shown.
          if (folders === null) set([]);
          throw err;
        },
      )
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

function revalidate() {
  refreshFolderList().catch(() => undefined);
}

function subscribeStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The list, `null` until the first load; mounting and coming back to the tab revalidate it. */
export function useFolderList(): Folder[] | null {
  const list = useSyncExternalStore(subscribeStore, () => folders, () => null);

  useEffect(() => {
    revalidate();
    return onForeground(revalidate);
  }, []);

  return list;
}
