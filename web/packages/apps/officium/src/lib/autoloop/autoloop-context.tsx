"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useAutoloop, type AutoloopControl } from "./use-autoloop";

const AutoloopContext = createContext<AutoloopControl | null>(null);

/**
 * One read of the project's autoloop for everything on the board that shows it (card://JAVA-1820): the header's
 * button and the integration-gate banner, so the two never disagree and the poll runs once. A Theater scene has no
 * API to ask: with `enabled` false nothing is read and the consumers get null.
 */
export function AutoloopProvider({ projectId, enabled, children }: { projectId: string; enabled: boolean; children: ReactNode }) {
  const control = useAutoloop(projectId, enabled);
  return <AutoloopContext.Provider value={enabled ? control : null}>{children}</AutoloopContext.Provider>;
}

/** The board's shared autoloop read, or null where none is made (a Theater scene). */
export const useBoardAutoloop = (): AutoloopControl | null => useContext(AutoloopContext);
