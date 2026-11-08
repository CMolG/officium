import { useSyncExternalStore } from "react";

/**
 * Observer mode's one piece of shared state (JAVA-803): whom the person is following on the page that
 * is open, and who in its room can be followed. The presence avatars (in the header) and the room (in
 * the page body) do not share a parent, and only one page is open at a time, so this is a module-level
 * store with a snapshot that changes only when something did.
 */
export interface Followed {
  accountId: string;
  name: string;
}

interface Snapshot {
  following: Followed | null;
  /** The accounts that have a caret or a viewport in the room right now. */
  followable: ReadonlySet<string>;
}

let snapshot: Snapshot = { following: null, followable: new Set() };
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const follow = (person: Followed) => publish({ ...snapshot, following: person });

export const stopFollowing = () => {
  if (snapshot.following) publish({ ...snapshot, following: null });
};

export function setFollowable(accountIds: ReadonlySet<string>) {
  const same = accountIds.size === snapshot.followable.size && [...accountIds].every((id) => snapshot.followable.has(id));
  if (same) return;
  const gone = snapshot.following && !accountIds.has(snapshot.following.accountId);
  publish({ following: gone ? null : snapshot.following, followable: accountIds });
}

export const useFollowing = (): Followed | null => useSyncExternalStore(subscribe, () => snapshot.following, () => null);

export const useFollowable = (): ReadonlySet<string> =>
  useSyncExternalStore(subscribe, () => snapshot.followable, () => EMPTY);

const EMPTY: ReadonlySet<string> = new Set();
