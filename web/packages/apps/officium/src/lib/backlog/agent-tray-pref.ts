import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the board's agent-work tray is expanded (JAVA-1547). It starts collapsed -- the summary is
 * the point, the list is on demand -- and a viewer who opens it finds it open next time.
 * `localStorage`, read and written defensively like `lib/docs/reading-prefs.ts`: blocked storage only
 * costs the remembered choice, never the board.
 */
const KEY = "officium:board:agent-tray-open:v1";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(open: boolean): void {
  try {
    localStorage.setItem(KEY, open ? "1" : "0");
  } catch {
    // Blocked storage: the choice lasts until the next render only.
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function useAgentTrayOpen(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((next: boolean) => write(next), []);
  return [open, set];
}
