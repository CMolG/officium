import { useCallback, useSyncExternalStore } from "react";

/**
 * Per-viewer reading choices of the documentation (JAVA-795): whether the contents list shows, and
 * whether the header counts words. `localStorage`, read and written defensively like `view-mode.ts`:
 * blocked storage only costs the remembered choice, never the page. Full width is NOT here: it is
 * for every viewer and lives on the server.
 */
export type ReadingPref = "contents" | "wordCount";

// Contents starts folded (JAVA-1535): the Contents button opens it, and the choice is remembered.
const DEFAULTS: Record<ReadingPref, boolean> = { contents: false, wordCount: false };
// A changed default needs a new key: under `v1` every viewer who had ever toggled Contents while it opened by default
// kept "1", so the folded default never reached them (JAVA-1535's review). `v2` starts everyone folded once.
const VERSION: Record<ReadingPref, number> = { contents: 2, wordCount: 1 };
const keyOf = (pref: ReadingPref) => `officium:docs:${pref}:v${VERSION[pref]}`;
const listeners = new Set<() => void>();

function read(pref: ReadingPref): boolean {
  try {
    const stored = localStorage.getItem(keyOf(pref));
    return stored === null ? DEFAULTS[pref] : stored === "1";
  } catch {
    return DEFAULTS[pref];
  }
}

function write(pref: ReadingPref, value: boolean): void {
  try {
    localStorage.setItem(keyOf(pref), value ? "1" : "0");
  } catch {
    // Blocked storage: the choice lasts until the next render only.
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function useReadingPref(pref: ReadingPref): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(pref),
    () => DEFAULTS[pref],
  );
  const set = useCallback((next: boolean) => write(pref, next), [pref]);
  return [value, set];
}
