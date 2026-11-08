import { ApiError } from "../api-error";
import { epicCheckpoints, checkpointProgress } from "../checkpoints";
import type { ExecutionModeSet, ExecutionModeSetting, ExecutionPreview } from "../execution-mode-repository";
import { isClosed } from "../status-config";
import type { WriteResult } from "../types";
import { now } from "./rules";
import { MemoryFormLanguages } from "./form-languages";

const DEFAULT: ExecutionModeSetting = { mode: "card", implementerRole: "core-implementer", version: 0, updatedAt: null };

/** The execution mode on the demo (card://JAVA-1878): kept per project for the page's life, as the server keeps a row. */
export class MemoryExecutionMode extends MemoryFormLanguages {
  private readonly executionModes = new Map<string, ExecutionModeSetting>();

  async getExecutionMode(projectId: string): Promise<ExecutionModeSetting> {
    this.requireRecord(projectId);
    return { ...(this.executionModes.get(projectId) ?? DEFAULT) };
  }

  async setExecutionMode(
    projectId: string,
    input: { expectedVersion: number; mode: "card" | "epic"; dryRun?: boolean },
  ): Promise<WriteResult<ExecutionModeSet>> {
    const record = this.requireRecord(projectId);
    if (record.project.role !== "owner") {
      throw new ApiError("forbidden", "Only the project's owner sets how its agents execute its cards", 403);
    }
    const current = this.executionModes.get(projectId) ?? DEFAULT;
    const preview = this.previewOf(projectId, input.mode);
    if (current.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The project's execution mode changed since you loaded it.",
        current: { setting: { ...current }, preview, applied: false } };
    }
    if (input.dryRun) return { setting: { ...current }, preview, applied: false };
    const next: ExecutionModeSetting = { ...current, mode: input.mode, version: current.version + 1, updatedAt: now() };
    this.executionModes.set(projectId, next);
    return { setting: { ...next }, preview, applied: true };
  }

  private previewOf(projectId: string, mode: "card" | "epic"): ExecutionPreview {
    const cards = [...this.requireRecord(projectId).cards.values()];
    const openEpics = cards.filter((c) => c.category === "epic" && !isClosed(c.status));
    const open = cards.filter((c) => c.category !== "epic" && !isClosed(c.status));
    const epics = openEpics.map((epic) => {
      const checkpoints = epicCheckpoints(epic.key, cards);
      return { key: epic.key, title: epic.title, checkpoints: checkpoints.length,
        completed: checkpointProgress(checkpoints).completed, sweepable: checkpoints.filter((c) => c.sweepable).length,
        open: checkpoints.filter((c) => !isClosed(c.status)).map((c) => c.key) };
    }).filter((epic) => epic.open.length > 0);
    const inEpics = new Set(epics.flatMap((epic) => epic.open)).size;
    return { mode, openCards: open.length, inEpics, standalone: open.length - inEpics,
      epics: epics.map(({ open: _open, ...epic }) => epic), workflows: [] };
  }
}
