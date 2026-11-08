import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Which blocks of the backlog view a viewer folded (JAVA-1553), per viewer and project: the active
 * sprint, each planned sprint and the Backlog (`BACKLOG_BLOCK`) fold on their own. `localStorage`,
 * read and written defensively like `agent-tray-pref.ts`: blocked storage only costs the remembered
 * choice, never the view.
 */
export const BACKLOG_BLOCK = "backlog";

const keyOf = (projectId: string) => `officium:backlog:folded:${projectId}:v1`;
const listeners = new Set<() => void>();

function readRaw(projectId: string): string {
  try {
    return localStorage.getItem(keyOf(projectId)) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function write(projectId: string, folded: string[]): void {
  try {
    localStorage.setItem(keyOf(projectId), JSON.stringify(folded));
  } catch {
    // Blocked storage: the choice lasts until the next render only.
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The ids of the folded blocks (a sprint's id, or `BACKLOG_BLOCK`) and a toggle for one of them. */
export function useFoldedSprints(projectId: string): { folded: ReadonlySet<string>; toggle: (blockId: string) => void } {
  const raw = useSyncExternalStore(subscribe, () => readRaw(projectId), () => "[]");
  const folded = useMemo(() => new Set(parse(raw)), [raw]);
  const toggle = useCallback(
    (blockId: string) => {
      const next = new Set(parse(readRaw(projectId)));
      if (!next.delete(blockId)) next.add(blockId);
      write(projectId, [...next]);
    },
    [projectId],
  );
  return { folded, toggle };
}
