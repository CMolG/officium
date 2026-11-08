"use client";

import { useSyncExternalStore } from "react";

/**
 * One sentence about what just happened to a project that outlives the screen it was said on
 * (JAVA-1554): deleting a project from the board's sidebar lands on the projects home, which is
 * where the sentence is read. No timer -- it stays until it is dismissed (WCAG 2.2.1).
 */
let current: string | null = null;
const listeners = new Set<() => void>();

export function setProjectNotice(message: string | null) {
  current = message;
  for (const listener of listeners) listener();
}

export function useProjectNotice(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
