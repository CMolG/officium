"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useVisualPerformance } from "@javadaba/ui/hooks";

import type { BoardCard } from "../../lib/backlog/board-copy";
import { useReadOnly } from "../../lib/backlog/read-only-context";
import { TaskCard } from "./TaskCard";

export interface SortableTaskCardProps {
  card: BoardCard;
  logged: number;
  muted?: boolean;
  activelyWorking?: boolean;
  onOpen: () => void;
}

/**
 * The board's draggable card -- `useSortable` gives it pointer, touch AND keyboard support at
 * once (JDB-224 item 1): once focused, Space picks it up, arrow keys move it across columns,
 * Space drops it, Escape cancels. `ref`/`attributes`/`listeners` are applied to `TaskCard`'s own
 * `article` (not a wrapping div): one focusable element per card, which is both the drag handle
 * and the open trigger, exactly like the concept's "the whole card is draggable" affordance.
 */
export function SortableTaskCard({ card, logged, muted, activelyWorking, onOpen }: SortableTaskCardProps) {
  // A viewer reads the board: no drag handle for them, the card still opens.
  const readOnly = useReadOnly();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { status: card.status },
    disabled: readOnly,
  });
  // JDB-238 motion policy: dnd-kit's resettle `transition` is an INLINE style, so no CSS rule
  // (not even `[data-capability="low"]`) can turn it off -- it has to be stripped here, in JS,
  // the same signal `AppShellClient` stamps as `data-capability` (`mode` already folds
  // `prefers-reduced-motion` in).
  const { mode } = useVisualPerformance();
  const reducedMotion = mode === "low";

  return (
    <TaskCard
      ref={setNodeRef}
      card={card}
      logged={logged}
      compact
      muted={muted}
      activelyWorking={activelyWorking}
      onOpen={onOpen}
      style={{ transform: CSS.Transform.toString(transform), transition: reducedMotion ? undefined : transition }}
      className={isDragging ? "opacity-40" : undefined}
      data-flip-id={card.id}
      {...attributes}
      {...listeners}
      // dnd-kit marks a card it cannot drag `aria-disabled`, which tells assistive technology it cannot be pressed. A
      // viewer's card still opens: it is only not draggable.
      {...(readOnly ? { "aria-disabled": undefined } : {})}
    />
  );
}
