"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useState } from "react";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";

import type { BoardCard } from "../../../lib/backlog/board-copy";
import { useBoardSensors } from "../../../lib/backlog/dnd-sensors";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import { isConflict, type Status } from "../../../lib/backlog/types";
import type { ConflictInfo } from "../ConflictDialog";
import { isSendBack } from "../../../lib/backlog/review-returns";
import { isApproval, landingStatus } from "../../../lib/backlog/quality-lineage";
import { refusalMessage } from "../../../lib/backlog/refusal-message";
import type { SendBackRequest } from "./use-board-dialogs";

export interface BoardDragInput {
  projectId: string;
  repository: BacklogRepository;
  cards: BoardCard[] | null;
  refresh: () => Promise<void>;
  setConflict: (info: ConflictInfo) => void;
  setError: (message: string | null, cardId?: string) => void;
  /** A card dropped back from review or deploy: the board asks why before it moves (card://JAVA-1416). */
  onSendBack: (request: SendBackRequest) => void;
}

/** Dragging a card between columns: the preview while it is held and the move when it lands. */
export function useBoardDrag({ projectId, repository, cards, refresh, setConflict, setError, onSendBack }: BoardDragInput) {
  const [previewCards, setPreviewCards] = useState<BoardCard[] | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<BoardCard | null>(null);

  const sensors = useBoardSensors();

  function handleDragStart(event: DragStartEvent) {
    const card = (cards ?? []).find((c) => c.id === String(event.active.id));
    setActiveDragCard(card ?? null);
    setPreviewCards(cards ? [...cards] : null);
  }

  function statusFromOverId(overId: string, source: BoardCard[]): Status | undefined {
    if (overId.startsWith("column:")) return overId.slice("column:".length) as Status;
    return source.find((c) => c.id === overId)?.status;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    setPreviewCards((prev) => {
      if (!prev) return prev;
      const activeId = String(active.id);
      const activeCard = prev.find((c) => c.id === activeId);
      if (!activeCard) return prev;
      const overStatus = statusFromOverId(String(over.id), prev);
      if (!overStatus || overStatus === activeCard.status) return prev;
      // A column that would not take the card (a spike on Deploy) shows no preview.
      if (landingStatus(activeCard.status, overStatus, activeCard.category) !== overStatus) return prev;
      return prev.map((c) => (c.id === activeId ? { ...c, status: overStatus, order: Number.MAX_SAFE_INTEGER } : c));
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const working = previewCards ?? cards ?? [];
    setPreviewCards(null);
    setActiveDragCard(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeCard = (cards ?? []).find((c) => c.id === activeId);
    if (!activeCard) return;
    const targetStatus = landingStatus(activeCard.status, statusFromOverId(overId, working) ?? activeCard.status, activeCard.category);
    if (!targetStatus) return;
    const destination = working.filter((c) => c.status === targetStatus && c.id !== activeId).sort((a, b) => a.order - b.order);
    let position = destination.length;
    if (!overId.startsWith("column:")) {
      const idx = destination.findIndex((c) => c.id === overId);
      if (idx >= 0) position = idx;
    }
    // A card leaving review asks what the review found: a send-back its reasons, an approval its scorecard.
    if (isSendBack(activeCard.status, targetStatus) || isApproval(activeCard.status, targetStatus, activeCard.category)) {
      onSendBack({ card: activeCard, to: targetStatus, position });
      await refresh();
      return;
    }
    const result = await refusalShown(activeCard, targetStatus, () => repository.moveCard(projectId, activeCard.id, {
      expectedVersion: activeCard.version,
      status: targetStatus,
      position,
    }));
    if (result && isConflict(result)) {
      // `refresh()` below already re-pulls the server's real state (theirs), so the drag is
      // never lost silently -- this only adds the choice to retry the SAME move against it.
      setConflict({
        message: result.message,
        current: result.current,
        onKeepMine: async () => {
          const retryResult = await refusalShown(activeCard, targetStatus, () => repository.moveCard(projectId, activeCard.id, {
            expectedVersion: result.current.version,
            status: targetStatus,
            position,
          }));
          if (retryResult && isConflict(retryResult)) setError("That card changed again -- try once more.");
          await refresh();
        },
      });
    }
    await refresh();
  }

  /** A move the server refuses for a rule (JAVA-292: a childless epic leaving Refine) says why in the board's alert,
   *  in the words of the sheet (Flx-Shell): which card, where it did not go, why, and that it stays where it was.
   *  The card is put back by the `refresh()` that follows. */
  async function refusalShown<T>(card: BoardCard, to: Status, write: () => Promise<T>): Promise<T | null> {
    try {
      return await write();
    } catch (err) {
      setError(refusalMessage(card, to, err), card.id);
      return null;
    }
  }

  return {
    sensors,
    previewCards,
    setPreviewCards,
    activeDragCard,
    setActiveDragCard,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

export type BoardDrag = ReturnType<typeof useBoardDrag>;
