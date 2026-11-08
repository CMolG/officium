import { useCallback, useSyncExternalStore } from "react";

/**
 * How wide a sidebar is (JAVA-799): per viewer, in `localStorage`, read and written defensively like
 * `reading-prefs.ts` (blocked storage only costs the remembered width). 256 is what `w-64` always was; the
 * splitter holds it between 208 and 480. Each sidebar names its own storage key (Documentation and
 * Configuration keep their widths apart).
 */
export const SIDEBAR_MIN = 208;
export const SIDEBAR_MAX = 480;
export const SIDEBAR_DEFAULT = 256;

const listeners = new Set<() => void>();
// What storage cannot keep: the width lasts for the page's life, like collapsible-sidebar's fallback.
const remembered = new Map<string, number>();

export function clampSidebarWidth(value: number): number {
  if (!Number.isFinite(value)) return SIDEBAR_DEFAULT;
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)));
}

/**
 * The width after a key on the splitter (WAI-ARIA window splitter): arrows move 16 px and Shift+arrows 64,
 * Home and End go to the ends. `null` when the key isn't the splitter's.
 */
export function stepSidebarWidth(width: number, key: string, shift: boolean): number | null {
  const step = shift ? 64 : 16;
  if (key === "ArrowRight") return clampSidebarWidth(width + step);
  if (key === "ArrowLeft") return clampSidebarWidth(width - step);
  if (key === "Home") return SIDEBAR_MIN;
  if (key === "End") return SIDEBAR_MAX;
  return null;
}

function read(storageKey: string): number {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === null ? (remembered.get(storageKey) ?? SIDEBAR_DEFAULT) : clampSidebarWidth(Number(stored));
  } catch {
    return remembered.get(storageKey) ?? SIDEBAR_DEFAULT;
  }
}

function write(storageKey: string, width: number): void {
  remembered.set(storageKey, width);
  try {
    localStorage.setItem(storageKey, String(width));
  } catch {
    // Blocked storage: `remembered` keeps it.
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function useSidebarWidth(storageKey: string) {
  const width = useSyncExternalStore(subscribe, () => read(storageKey), () => SIDEBAR_DEFAULT);
  const setWidth = useCallback((next: number) => write(storageKey, clampSidebarWidth(next)), [storageKey]);
  const reset = useCallback(() => write(storageKey, SIDEBAR_DEFAULT), [storageKey]);
  return { width, setWidth, reset };
}
