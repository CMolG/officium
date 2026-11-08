import type { WriteResult } from "./types";

/**
 * How a project's agents execute its cards (card://JAVA-1878, epic JAVA-1868): `card`, each card handed out and worked
 * on its own (the default), or `epic`, where an open epic is worked in one agent session that builds its cards in
 * order. `version` 0 is a project that never set it.
 */
export interface ExecutionModeSetting {
  mode: "card" | "epic";
  implementerRole: string;
  version: number;
  updatedAt: string | null;
}

/** What a switch does to the open cards: none is rewritten, each belongs to its open epic or stands alone. */
export interface ExecutionPreview {
  mode: "card" | "epic";
  openCards: number;
  inEpics: number;
  standalone: number;
  epics: { key: string; title: string; checkpoints: number; completed: number; sweepable: number }[];
  workflows: { key: string; role: string; mods: string[] }[];
}

/** `applied` is false on a dry run, whose `setting` is the one still in force. */
export interface ExecutionModeSet {
  setting: ExecutionModeSetting;
  preview: ExecutionPreview;
  applied: boolean;
}

export interface ExecutionModeRepository {
  getExecutionMode(projectId: string): Promise<ExecutionModeSetting>;
  /** Owner only (`403`, thrown). A stale version answers the conflict shape with the current setting. */
  setExecutionMode(
    projectId: string,
    input: { expectedVersion: number; mode: "card" | "epic"; dryRun?: boolean },
  ): Promise<WriteResult<ExecutionModeSet>>;
}
