"use client";

import { useRef } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button, NavGroupLabel } from "@javadaba/ui";

import { useBoardSensors } from "../../lib/backlog/dnd-sensors";
import { useDocStars } from "../../lib/docs/use-doc-stars";
import { StarRow } from "./StarRow";

const idOf = (star: { kind: string; path: string }) => `${star.kind}:${star.path}`;

/**
 * The caller's stars, on top of the sidebar (JAVA-799): their own, in their own order. Reorder by dragging a
 * row's grip, or Alt+ArrowUp/ArrowDown on its name; a failed move puts the list back and says why. Loading,
 * empty (with what to do) and error (with Try again) are all drawn.
 */
export function StarredList({
  projectId,
  current,
  onNavigate,
  onReveal,
}: {
  projectId: string;
  current: string | null;
  onNavigate: () => void;
  onReveal: (path: string) => void;
}) {
  const { stars, error, notice, move, toggle, retry } = useDocStars();
  const sensors = useBoardSensors();
  const list = useRef<HTMLUListElement>(null);

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!stars || !over || active.id === over.id) return;
    const from = stars.findIndex((star) => idOf(star) === active.id);
    const to = stars.findIndex((star) => idOf(star) === over.id);
    if (from >= 0 && to >= 0) void move(from, to);
  }

  async function moveBy(index: number, delta: -1 | 1) {
    const star = stars?.[index];
    if (!star) return;
    await move(index, index + delta);
    const row = `[data-star-id="${CSS.escape(idOf(star))}"]`;
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`${row} a, ${row} button:not([aria-label])`)?.focus());
  }

  return (
    <section aria-labelledby="starred-heading" className="flex flex-col gap-0.5" data-testid="starred">
      <h2 id="starred-heading" className="m-0">
        <NavGroupLabel className="px-2 pt-1">Starred</NavGroupLabel>
      </h2>
      {stars === null && !error && (
        <p role="status" className="px-2 py-1 text-xs text-[color:var(--jd-muted)]">
          Loading starred…
        </p>
      )}
      {stars === null && error && (
        <div role="alert" className="flex flex-col items-start gap-1 px-2 py-1">
          <p className="text-xs text-destructive">Couldn&apos;t load your starred pages: {error}</p>
          <Button type="button" register="ui" size="sm" variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
      {stars !== null && stars.length === 0 && (
        <p className="px-2 py-1 text-xs text-[color:var(--jd-muted)]">Star a page to keep it here.</p>
      )}
      {stars !== null && stars.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={stars.map(idOf)} strategy={verticalListSortingStrategy}>
            <ul ref={list} aria-label="Starred pages" className="flex flex-col gap-0.5">
              {stars.map((star, index) => (
                <StarRow
                  key={idOf(star)}
                  star={star}
                  projectId={projectId}
                  current={current}
                  onNavigate={onNavigate}
                  onReveal={onReveal}
                  onMove={(delta) => void moveBy(index, delta)}
                  onRemove={() => void toggle(star.path, star.kind)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {notice && <p className="px-2 pt-1 text-xs text-[color:var(--jd-muted)]">{notice}</p>}
    </section>
  );
}
