"use client";

import { useState } from "react";

import { ProjectCells } from "./ProjectCells";
import { ActiveProfileCard } from "./ActiveProfileCard";

/** A project's roles page: its work profile (card://JAVA-1524), then its matrix, read again when the profile changes. */
export function WorkProfileSurface({ projectId }: { projectId: string }) {
  // A remount would drop an open draft; ProjectCells re-reads its base instead and keeps the draft (JAVA-1627, D4).
  const [round, setRound] = useState(0);
  return (
    <ProjectCells
      projectId={projectId}
      reloadKey={round}
      header={<ActiveProfileCard projectId={projectId} onActivated={() => setRound((n) => n + 1)} />}
    />
  );
}
