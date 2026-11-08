import { useSyncExternalStore } from "react";

import type { ViewMode } from "../../components/backlog/TopBar";

/**
 * Which view a project's board opens in (JAVA-128, user request 2026-09-26). The view a person
 * picked is remembered per project and wins; with none picked, a phone opens in stack -- the
 * board's columns are a desktop composition -- and anything from `lg` up opens in board.
 *
 * `localStorage` like `board-copy.ts`, read and written defensively: blocked storage only costs
 * the remembered choice, never the board. With no `matchMedia` (Android) it is a phone.
 */
const VIEW_MODES: readonly ViewMode[] = ["board", "list", "stack"];
const keyOf = (projectId: string) => `officium:view:v1:${projectId}`;

// Resolved once per project and tab, so the default is the INITIAL view: resizing across `lg`
// later never swaps the view under the person.
const resolved = new Map<string, ViewMode>();
const listeners = new Set<() => void>();

function stored(projectId: string): ViewMode | null {
  try {
    const mode = localStorage.getItem(keyOf(projectId));
    return VIEW_MODES.includes(mode as ViewMode) ? (mode as ViewMode) : null;
  } catch {
    return null;
  }
}

function wide(): boolean {
  return globalThis.matchMedia?.("(min-width: 64rem)").matches ?? false;
}

function viewModeOf(projectId: string): ViewMode {
  let mode = resolved.get(projectId);
  if (!mode) {
    mode = stored(projectId) ?? (wide() ? "board" : "stack");
    resolved.set(projectId, mode);
  }
  return mode;
}

export function chooseViewMode(projectId: string, mode: ViewMode): void {
  resolved.set(projectId, mode);
  try {
    localStorage.setItem(keyOf(projectId), mode);
  } catch {
    // Full or blocked: the choice lasts this visit, and the next one opens in the default.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The project's view, or null while the server renders and the page hydrates: the server cannot
 * know the width, so it draws no view at all rather than a board a phone would then swap away.
 */
export function useViewMode(projectId: string): ViewMode | null {
  return useSyncExternalStore(subscribe, () => viewModeOf(projectId), () => null);
}
