"use client";

import { useSyncExternalStore } from "react";

/*
 * The unread count the Javadaba diamond shows (JAVA-1621).
 *
 * The inbox in `@javadaba/account` knows the session and writes this; the diamond lives in this
 * package, which account depends on, so it cannot import account back. A module store read with
 * `useSyncExternalStore` (as `toast-store.ts` is) crosses that line without a prop, a provider or
 * a registry. Every app mounts nothing: the count is already there once the inbox has run. On the
 * server it stays at 0, which is also what a signed-out page should paint.
 */

let unread = 0;
const listeners = new Set<() => void>();

/** Sets the count the diamond shows. Writing the same value again is a no-op. */
export function setMenuUnread(count: number): void {
  const next = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (next === unread) return;
  unread = next;
  for (const listen of listeners) listen();
}

function subscribe(listen: () => void): () => void {
  listeners.add(listen);
  return () => {
    listeners.delete(listen);
  };
}

/** The count the diamond shows right now. */
export function useMenuUnread(): number {
  return useSyncExternalStore(subscribe, () => unread, () => 0);
}
