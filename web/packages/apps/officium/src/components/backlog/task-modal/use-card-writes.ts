"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import { isSendBack } from "../../../lib/backlog/review-returns";
import { isApproval } from "../../../lib/backlog/quality-lineage";
import { isConflict, type Assignee, type Card, type CardDetail, type Category, type Executor, type Priority, type RunState, type SpikeSubtype, type Status } from "../../../lib/backlog/types";
import type { ConflictInfo } from "../ConflictDialog";
import type { OnChanged } from "./types";

/** Sentinel "position" for `changeStatus`'s "move to the end of the destination column" --
 *  see the comment at its one call site for why not `Number.MAX_SAFE_INTEGER`. */
export const END_OF_COLUMN = 1_000_000;

export interface CardWritesInput {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  onChanged: OnChanged;
  onConflict?: (info: ConflictInfo) => void;
}

/** The writes a card's fields go through, with the one error banner and the conflict hand-off they share. */
export function useCardWrites({ projectId, repository, detail, onChanged, onConflict }: CardWritesInput) {
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);
  /** Where the card is being sent back to, while the dialog asking why is open (card://JAVA-1416). */
  const [sendBackTo, setSendBackTo] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Every write below goes through this: a 409 opens the conflict dialog (JDB-226) if the
   *  parent wired one, or falls back to the plain error banner -- either way, never silently
   *  dropped. `retry` re-issues the exact same write against the server's `current.version`. */
  function reportConflict(result: { error: "version_conflict"; message: string; current: Card }, retry: () => Promise<void>) {
    if (onConflict) onConflict({ message: result.message, current: result.current, onKeepMine: retry });
    else setError(result.message);
  }

  /** A write the server refuses for a rule (not a version conflict) says why in the modal's alert. */
  async function refusalShown<T>(write: () => Promise<T>): Promise<T | null> {
    try {
      return await write();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the card.");
      return null;
    }
  }

  async function changeStatus(next: Status) {
    // A refusal's alert belongs to that attempt: a move that goes through clears it, or a stale
    // "no action plan" stays under a card that has its plan and is already in To do.
    setError(null);
    // A send-back from review or deploy carries its reasons and findings: the dialog asks for them.
    // An approval out of review carries its scorecard (card://JAVA-1526): the same dialog slot asks for it.
    if (isSendBack(detail.status, next) || isApproval(detail.status, next, detail.category)) {
      setSendBackTo(next);
      return;
    }
    const result = await refusalShown(() => repository.moveCard(projectId, detail.id, {
      expectedVersion: detail.version,
      status: next,
      // "Put it at the end of the destination column" -- NOT `Number.MAX_SAFE_INTEGER`
      // (found against the real API, JDB-233): the server's `move` endpoint takes `position` as
      // a Java `int` (`CardService#move`), and a JS safe integer overflows it, so Jackson fails
      // the whole request before the handler's own clamp-to-column-length logic ever runs -- the
      // in-memory repository has no such boundary, so this only ever broke against `javadaba-api`.
      // Any value comfortably past a realistic column length reaches the same clamp with no
      // overflow risk anywhere downstream.
      position: END_OF_COLUMN,
    }));
    if (!result) return;
    if (isConflict(result)) {
      reportConflict(result, () => changeStatus(next));
      return;
    }
    await onChanged({ ...detail, ...result });
  }

  async function changeExecutor(next: Executor) {
    const result = await repository.setExecutor(projectId, detail.id, { expectedVersion: detail.version, executor: next });
    if (isConflict(result)) {
      reportConflict(result, () => changeExecutor(next));
      return;
    }
    await onChanged({ ...detail, ...result });
    // Switching to human always ends with an assignee (the repository defaults to the project
    // owner) -- opening the picker lets the person confirm or hand it to someone else right away
    // instead of discovering the default later.
    if (next === "human" && detail.executor !== "human") setAssigneeModalOpen(true);
  }

  async function changeRunState(next: RunState) {
    const result = await refusalShown(() =>
      repository.setRunState(projectId, detail.id, { expectedVersion: detail.version, runState: next }),
    );
    if (!result) return;
    if (isConflict(result)) {
      reportConflict(result, () => changeRunState(next));
      return;
    }
    await onChanged({ ...detail, ...result });
  }

  async function changeCategory(next: Category | null) {
    const result = await repository.updateCard(projectId, detail.id, { expectedVersion: detail.version, category: next });
    if (isConflict(result)) {
      reportConflict(result, () => changeCategory(next));
      return;
    }
    await onChanged({ ...detail, ...result });
  }

  async function changeSubtype(next: SpikeSubtype) {
    const result = await repository.updateCard(projectId, detail.id, { expectedVersion: detail.version, subtype: next });
    if (isConflict(result)) {
      reportConflict(result, () => changeSubtype(next));
      return;
    }
    await onChanged({ ...detail, ...result });
  }

  /** Priority, epic and tags, from the side column (Off-Card, "now editable"): one write, whichever field changed. */
  async function saveFields(patch: { priority?: Priority; epic?: string | null; tags?: string[] }) {
    const result = await refusalShown(() => repository.updateCard(projectId, detail.id, { expectedVersion: detail.version, ...patch }));
    if (!result) return;
    if (isConflict(result)) {
      reportConflict(result, () => saveFields(patch));
      return;
    }
    await onChanged({ ...detail, ...result });
  }

  async function saveAssignees(next: Assignee[]) {
    const result = await repository.changeAssignee(projectId, detail.id, { expectedVersion: detail.version, assignees: next });
    if (isConflict(result)) {
      reportConflict(result, () => saveAssignees(next));
      return;
    }
    await onChanged({ ...detail, ...result });
  }

  return {
    error,
    setError,
    assigneeModalOpen,
    setAssigneeModalOpen,
    sendBackTo,
    setSendBackTo,
    reportConflict,
    changeStatus,
    changeExecutor,
    changeRunState,
    changeCategory,
    changeSubtype,
    saveFields,
    saveAssignees,
  };
}

export type CardWrites = ReturnType<typeof useCardWrites>;
