"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import { isConflict, type CardDetail, type Signal } from "../../../lib/backlog/types";
import { SIGNAL_ORDER } from "../../../lib/backlog/role-config";
import type { OnChanged, ReportConflict } from "./types";

export interface CardSignalsInput {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  onChanged: OnChanged;
  reportConflict: ReportConflict;
}

/** Adding, removing and undoing the removal of a signal. */
export function useCardSignals({ projectId, repository, detail, onChanged, reportConflict }: CardSignalsInput) {
  const [addSignalOpen, setAddSignalOpen] = useState(false);
  // The signal the person just removed, so they can put it back (JAVA-521: reversible -> undo).
  // Keyed by card: this modal can switch to a linked card without remounting.
  const [removed, setRemoved] = useState<{ cardId: string; signal: Signal } | null>(null);
  const removedSignal = removed?.cardId === detail.id && !detail.signals.includes(removed.signal) ? removed.signal : null;

  /** True once the card carries `next`; false when a conflict took over. */
  async function changeSignals(next: Signal[]): Promise<boolean> {
    const result = await repository.updateCard(projectId, detail.id, { expectedVersion: detail.version, signals: next });
    if (isConflict(result)) {
      reportConflict(result, async () => {
        await changeSignals(next);
      });
      return false;
    }
    await onChanged({ ...detail, ...result });
    return true;
  }

  async function addSignal(signal: Signal) {
    setAddSignalOpen(false);
    setRemoved(null);
    await changeSignals(SIGNAL_ORDER.filter((s) => s === signal || detail.signals.includes(s)));
  }

  async function removeSignal(signal: Signal) {
    if (await changeSignals(detail.signals.filter((s) => s !== signal))) setRemoved({ cardId: detail.id, signal });
  }

  async function undoRemoveSignal() {
    if (!removedSignal) return;
    const signal = removedSignal;
    setRemoved(null);
    await changeSignals(SIGNAL_ORDER.filter((s) => s === signal || detail.signals.includes(s)));
  }

  return { addSignalOpen, setAddSignalOpen, removedSignal, addSignal, removeSignal, undoRemoveSignal };
}

export type CardSignals = ReturnType<typeof useCardSignals>;
