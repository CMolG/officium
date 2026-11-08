"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Select, Text } from "@javadaba/ui";

import { FIELD_SELECT } from "../../lib/field-select";
import type { BoardCard } from "../../lib/backlog/board-copy";
import { TaskCard } from "./TaskCard";

/** A row + its keyboard/menu alternative to dragging (JAVA-54 acceptance criterion): a "Move
 *  to…" select right on the row, always reachable without a pointer. */
export function BacklogRow({
  card,
  onOpen,
  moveOptions,
  onMove,
}: {
  card: BoardCard;
  onOpen: () => void;
  moveOptions: { value: string; label: string }[];
  onMove: (target: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  // An epic may only go back to the backlog (JAVA-290); in the backlog it has nowhere to go, so the
  // row says why instead of offering a move the API refuses.
  const isEpic = card.category === "epic";
  const options = isEpic ? moveOptions.filter((o) => o.value === "sprint:backlog") : moveOptions;
  return (
    // The card, then its "Move to…" under it on a phone: side by side, the select took a third of
    // the width and the card's title wrapped a word per line (JAVA-59).
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <TaskCard
          ref={setNodeRef}
          card={card}
          logged={0}
          compact
          onOpen={onOpen}
          style={{ transform: CSS.Transform.toString(transform), transition }}
          className={isDragging ? "opacity-40" : undefined}
          {...attributes}
          {...listeners}
        />
      </div>
      {options.length > 0 ? (
        <Select
          aria-label={`Move ${card.key} to…`}
          value={null}
          placeholder="Move to…"
          onChange={onMove}
          options={options}
          className={`${FIELD_SELECT} sm:w-32 sm:shrink-0`}
        />
      ) : (
        isEpic && (
          <Text className="text-xs text-[color:var(--jd-muted)] sm:w-32 sm:shrink-0">
            Epics aren&apos;t planned: their children are
          </Text>
        )
      )}
    </div>
  );
}
