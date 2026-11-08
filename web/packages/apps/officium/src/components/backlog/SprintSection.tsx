"use client";

import { useId } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronRight, Timer } from "lucide-react";

import type { BoardCard } from "../../lib/backlog/board-copy";
import type { Sprint } from "../../lib/backlog/types";
import { SprintRows } from "./SprintRows";
import { SprintActions } from "./SprintActions";

/** One section's droppable id: `sprint:<id>` or `sprint:backlog`. */
export function sectionId(sprintId: string | null): string {
  return `sprint:${sprintId ?? "backlog"}`;
}

/**
 * One block of the backlog view: the active sprint, a planned sprint or the Backlog (`sprint` null).
 * The title is a disclosure that folds the block (JAVA-1553); the section keeps its droppable ref
 * folded, so a card can still be dropped on it.
 */
export function SprintSection({
  sprint,
  cards,
  total,
  searching,
  allSprints,
  onOpenCard,
  onMoveCard,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  startDisabledReason,
  folded,
  onToggleFold,
}: {
  sprint: Sprint | null;
  /** The cards the search lets through: all of them while nobody searches. */
  cards: BoardCard[];
  /** Every card of the block, searched or not: the "N of M" a search shows. */
  total: number;
  searching: boolean;
  allSprints: Sprint[];
  onOpenCard: (id: string) => void;
  onMoveCard: (cardId: string, targetSprintId: string | null, position: number) => void;
  onStart?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  startDisabledReason?: string | null;
  /** Folded (JAVA-1553): the dates and the rows are not drawn, the header and the drop target stay. */
  folded: boolean;
  onToggleFold: () => void;
}) {
  const id = sectionId(sprint?.id ?? null);
  const bodyId = useId();
  const { setNodeRef, isOver } = useDroppable({ id });
  const estimate = cards.reduce((sum, c) => sum + c.estimate, 0);
  const label = sprint?.name ?? "Backlog";

  const moveOptions = [
    ...(sprint ? [{ value: "sprint:backlog", label: "Backlog" }] : []),
    ...allSprints.filter((s) => s.id !== sprint?.id && s.state !== "closed").map((s) => ({ value: sectionId(s.id), label: s.name })),
  ];

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} section`}
      className={`flex flex-col gap-3 rounded-[var(--radius-jd-xl)] border p-4 transition-colors ${
        isOver ? "border-[color:var(--jd-accent)]/40 bg-[color:var(--jd-accent)]/[0.06]" : "border-[color:var(--jd-line)]"
      }`}
    >
      <header className="flex flex-row flex-wrap items-center gap-2">
        <h2 className="flex flex-row items-center gap-2 text-sm font-bold">
          <button
            type="button"
            aria-expanded={!folded}
            aria-controls={bodyId}
            title={folded ? `Unfold ${label}` : `Fold ${label}`}
            onClick={onToggleFold}
            className="flex flex-row min-h-11 items-center gap-1.5 rounded-[var(--radius-jd-sm)] pr-1 text-left font-bold hover:text-[color:var(--jd-muted)]"
          >
            <ChevronRight size={14} className={`shrink-0 transition-transform ${folded ? "" : "rotate-90"}`} aria-hidden="true" />
            {label}
          </button>
          {sprint?.state === "active" && (
            <span className="rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-accent)]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-[color:var(--jd-accent)]">
              Active
            </span>
          )}
        </h2>
        {sprint?.goal && <p className="text-xs text-[color:var(--jd-muted)]">{sprint.goal}</p>}
        <span className="ml-auto flex flex-row shrink-0 items-center gap-3 text-xs font-medium text-[color:var(--jd-muted)]">
          <span>
            {searching ? `${cards.length} of ${total}` : cards.length} {(searching ? total : cards.length) === 1 ? "card" : "cards"}
          </span>
          <span className="flex flex-row items-center gap-1">
            <Timer size={12} aria-hidden="true" /> {estimate}h
          </span>
        </span>
        {sprint && (
          <SprintActions
            sprint={sprint}
            onStart={onStart}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            startDisabledReason={startDisabledReason}
          />
        )}
      </header>
      {folded && searching && cards.length > 0 && (
        <p className="text-xs font-medium text-[color:var(--jd-muted)]">
          {cards.length} matching {cards.length === 1 ? "card is" : "cards are"} folded: unfold {label} to see {cards.length === 1 ? "it" : "them"}.
        </p>
      )}
      {!folded && (
        <SprintRows
          id={bodyId}
          sprint={sprint}
          cards={cards}
          searching={searching}
          moveOptions={moveOptions}
          onOpenCard={onOpenCard}
          onMoveCard={onMoveCard}
        />
      )}
    </section>
  );
}
