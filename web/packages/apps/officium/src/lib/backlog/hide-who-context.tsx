"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getSharing } from "../configuration/sharing";

/**
 * Whether the board hides WHO did the work: an agent or a person, the assignees and who made the last change
 * (Configuration, Sharing; Off-Shell 9.03). Only a viewer is ever kept from it, and only while the project has not
 * turned "Show viewers who did the work" on. Anywhere it is not provided, nothing is hidden.
 */
const HideWhoContext = createContext(false);

export const useHideWho = () => useContext(HideWhoContext);

/** Provides the answer for one project. A member who can edit never asks the server: it is theirs to see. */
export function HideWhoProvider({ projectId, viewer, children }: { projectId: string; viewer: boolean; children: ReactNode }) {
  // `null` is "not answered yet" and "the API does not serve it": both keep the viewer from seeing who, the safe side.
  const [showWho, setShowWho] = useState<boolean | null>(null);

  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    getSharing(projectId).then(
      (settings) => !cancelled && setShowWho(settings?.showWho ?? false),
      () => !cancelled && setShowWho(false),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, viewer]);

  return <HideWhoContext.Provider value={viewer && showWho !== true}>{children}</HideWhoContext.Provider>;
}
