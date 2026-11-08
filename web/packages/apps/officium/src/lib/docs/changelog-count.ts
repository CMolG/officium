"use client";

import { useEffect, useSyncExternalStore } from "react";
import { onForeground } from "@javadaba/sdk/platform";

import { getBacklogRepository } from "../backlog/get-repository";
import { IS_LOCAL } from "../edition";

/**
 * How many changes of a project's changelog still wait for someone to say what the docs did about
 * them (JAVA-132, officium-api.md §8.8), held once for every surface that shows it -- the sidebar's
 * Documentation entry and the changelog link in the docs tree. Coinciding reads share one request,
 * `changelog.changed` on the project's (already shared) live channel refetches it, and so does
 * coming back to the tab (architecture.md, client fetch discipline).
 */
const counts = new Map<string, number>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function refresh(projectId: string) {
  if (inFlight.has(projectId)) return;
  const request = getBacklogRepository()
    .listChangelog(projectId, { status: "pending", limit: 1 })
    .then(
      (listing) => {
        counts.set(projectId, listing.pendingCount);
        for (const listener of listeners) listener();
      },
      // A count that can't be read is left out, not shown as a zero that looks like a fact.
      () => undefined,
    )
    .finally(() => inFlight.delete(projectId));
  inFlight.set(projectId, request);
}

function subscribeStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The project's pending count, `null` until it is known (or when `projectId` is absent). */
export function usePendingChangelogCount(projectId: string | undefined): number | null {
  const count = useSyncExternalStore(
    subscribeStore,
    () => (projectId ? (counts.get(projectId) ?? null) : null),
    () => null,
  );

  useEffect(() => {
    // Officium Local keeps no changelog: nothing to count, nothing to ask.
    if (!projectId || IS_LOCAL) return;
    refresh(projectId);
    const offForeground = onForeground(() => refresh(projectId));
    const offLive = getBacklogRepository().subscribe(projectId, (event) => {
      if (event.type === "changelog.changed" || event.type === "stream.ready") refresh(projectId);
    });
    return () => {
      offForeground();
      offLive();
    };
  }, [projectId]);

  return count;
}
