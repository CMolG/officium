import { useSyncExternalStore } from "react";

/**
 * Page drafts that could not be saved before the person left the page inside the app (JAVA-796).
 * Leaving is reversible, so it asks nothing: the draft waits here, in memory, and comes back when
 * the page opens again; the docs view names each one with a way back to it. A reload loses them,
 * which is why the browser's own prompt guards that path (`onBeforeLeave`).
 */
export interface UnsavedDraft {
  projectId: string;
  path: string;
  title: string;
  body: string;
}

const drafts = new Map<string, UnsavedDraft>();
const listeners = new Set<() => void>();
let snapshot: readonly UnsavedDraft[] = [];

const keyOf = (projectId: string, path: string) => `${projectId}\u0000${path}`;

function changed() {
  snapshot = [...drafts.values()];
  for (const listener of listeners) listener();
}

export function stashDraft(draft: UnsavedDraft): void {
  drafts.set(keyOf(draft.projectId, draft.path), draft);
  changed();
}

/** The draft kept for the page, taken out: the page that asks for it is the one that saves it now. */
export function takeDraft(projectId: string, path: string): UnsavedDraft | null {
  const key = keyOf(projectId, path);
  const draft = drafts.get(key) ?? null;
  if (draft) {
    drafts.delete(key);
    changed();
  }
  return draft;
}

export function useUnsavedDrafts(projectId: string): UnsavedDraft[] {
  const all = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
  return all.filter((draft) => draft.projectId === projectId);
}
