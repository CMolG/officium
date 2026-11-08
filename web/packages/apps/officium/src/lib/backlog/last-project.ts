"use client";

import { YOU as CURRENT_USER } from "./memory-seed";

/**
 * The last opened project, remembered per person (JDB-225 directive). Keyed by account id when
 * there is one -- `useAuthSession()`'s real `accountId` once JDB-226 wired the API, falling back
 * to `CURRENT_USER.accountId` (a fixed local id) for the mock-backed e2e suite, which has no
 * session to key by.
 *
 * `localStorage`, not the repository: this is a per-viewer UI convenience (which project to
 * surface first), not state other people or the API need to see --
 * `.harness/rules/architecture.md`'s client fetch discipline reserves the cache/repository for
 * that.
 */
const MAX_RECENTS = 5;

function storageKey(accountId: string): string {
  return `officium:recentProjects:${accountId}`;
}

export function recordProjectOpened(projectId: string, accountId: string = CURRENT_USER.accountId): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readRecents(accountId);
    const next = [projectId, ...existing.filter((id) => id !== projectId)].slice(0, MAX_RECENTS);
    window.localStorage.setItem(storageKey(accountId), JSON.stringify(next));
  } catch {
    // Private window, blocked storage, quota -- a UI convenience, never worth failing over.
  }
}

export function readRecents(accountId: string = CURRENT_USER.accountId): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(accountId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}
