"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CalendarDays } from "lucide-react";

import type { BoardCard } from "../../lib/backlog/board-copy";
import type { Sprint } from "../../lib/backlog/types";
import { BacklogRow } from "./BacklogRow";

/** The body of a backlog block: its dates and its sortable rows (what the search let through). */
export function SprintRows({
  id,
  sprint,
  cards,
  searching,
  moveOptions,
  onOpenCard,
  onMoveCard,
}: {
  id: string;
  sprint: Sprint | null;
  cards: BoardCard[];
  searching: boolean;
  moveOptions: { value: string; label: string }[];
  onOpenCard: (id: string) => void;
  onMoveCard: (cardId: string, targetSprintId: string | null, position: number) => void;
}) {
  return (
    <div id={id} className="flex flex-col gap-3">
      {sprint && (sprint.startDate || sprint.endDate) && (
        <p className="flex flex-row items-center gap-1 text-xs text-[color:var(--jd-muted)]">
          <CalendarDays size={12} aria-hidden="true" /> {sprint.startDate ?? "…"} — {sprint.endDate ?? "…"}
        </p>
      )}

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {cards.length === 0 ? (
            <p className="rounded-[var(--radius-jd-md)] border border-dashed border-[color:var(--jd-line)] px-3 py-4 text-center text-xs text-[color:var(--jd-faint)]">
              {searching ? "No card here matches" : "Drop a card here"}
            </p>
          ) : (
            cards.map((card) => (
              <BacklogRow
                key={card.id}
                card={card}
                onOpen={() => onOpenCard(card.id)}
                moveOptions={moveOptions}
                onMove={(target) => {
                  const targetSprintId = target === "sprint:backlog" ? null : target.slice("sprint:".length);
                  onMoveCard(card.id, targetSprintId, 0);
                }}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
