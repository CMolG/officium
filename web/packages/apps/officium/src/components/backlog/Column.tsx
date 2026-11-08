"use client";

import { useLayoutEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import type { Status } from "../../lib/backlog/types";
import { StatusShape } from "./StatusShape";
import { SortableTaskCard } from "./SortableTaskCard";
import type { BoardCard } from "../../lib/backlog/board-copy";

/** The board's `column:<status>` droppable id, distinct from any card id so dropping on an
 *  empty column is unambiguous. */
export function columnDroppableId(status: Status): string {
  return `column:${status}`;
}

export function Column({
  status,
  cards,
  bottomInset = 0,
  loggedOf,
  matches,
  isWorking,
  onOpenCard,
  liftKey = "",
  stacked = false,
}: {
  status: Status;
  cards: BoardCard[];
  /** Below `lg` the column is a full-width block in a stack and its list grows with its cards;
   *  from `lg`, a rail in the row. The Theater passes false: always a rail. */
  stacked?: boolean;
  /** Changes with every filter; while one is on, the matches sit at the top (`Board`), so the list
   *  scrolls back up to them instead of leaving the person scrolling to find them (JAVA-47). */
  liftKey?: string;
  /** Height (px) something floating covers at the bottom of the board: added to the card
   *  list's scroll room, never taken from the column's height. */
  bottomInset?: number;
  loggedOf: (cardId: string) => number;
  matches: (cardId: string) => boolean;
  isWorking: (cardId: string) => boolean;
  onOpenCard: (cardId: string) => void;
}) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });
  const listRef = useRef<HTMLDivElement | null>(null);
  // A layout effect, and a child's: it runs before `Board`'s card glide measures where the cards
  // landed, so the glide starts from where they were on screen and ends where they are now.
  useLayoutEffect(() => {
    if (liftKey && listRef.current) listRef.current.scrollTop = 0;
  }, [liftKey]);

  return (
    <section
      aria-label={`${config.label} column`}
      // layout-ok: a kanban column is a rail, the same fixed-width exception the skill grants
      // sidebars -- its cards must not reflow width as columns scroll horizontally. Stacked on a
      // phone it is the full width instead: nothing there scrolls sideways (JAVA-127).
      className={`flex ${stacked ? "w-full lg:h-full lg:w-75" : "h-full w-75"} shrink-0 snap-start flex-col rounded-[var(--radius-jd-bento-m)] bg-[color:var(--jd-card)] p-2.5 transition-colors ${
        isOver ? "bg-[color:var(--jd-card-hover)] shadow-[inset_0_0_0_2px_var(--jd-ink)]" : ""
      }`}
    >
      {/* The state's shape, its name and its count (Off-Board, "Six columns"): the polygon wears the state's
          colour, and the polygon and the word say which column this is without it. */}
      <header className="mb-2.5 flex flex-row shrink-0 items-center gap-2 px-1 pt-0.5">
        <StatusShape status={status} className="size-4 shrink-0" title={config.label} />
        <h2 className="m-0 min-w-0 truncate text-[13px] font-bold text-[color:var(--jd-ink)]">{config.label}</h2>
        <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-[color:var(--jd-muted)]">{cards.length}</span>
      </header>
      {/* Room inside the scroll box for a card's hover: it lifts 2px and casts a shadow, and a
          scroll container clips both at its padding edge. With no top padding the first card's
          top border was shaved off on hover and it read as cut (2026-09-15). The negative
          margin keeps the cards' width where it was while the padding gives the shadow room. */}
      {/* The padding gives the last card room to scroll out from under the floating list; the
          scroll-padding makes every scroll that brings a card into view -- keyboard focus, a
          drag's auto-scroll -- stop above the list instead of under it. `transitionProperty:
          none`: both follow the list frame by frame, and under reduced motion `tokens.css` would
          still leave a 0.01ms "running" transition. */}
      <div
        ref={(node) => {
          setNodeRef(node);
          listRef.current = node;
        }}
        data-testid="column-cards"
        // `scroll-pt-1.5` matches `pt-1.5`: a card scrolled into view keeps the hover-lift room
        // above it too, even when it is taller than what the floating list leaves visible.
        className="-mx-2 flex min-h-16 min-w-0 flex-1 scroll-pt-1.5 flex-col gap-2.5 overflow-y-auto px-2 pb-3 pt-1.5"
        style={bottomInset ? { paddingBottom: bottomInset, scrollPaddingBottom: bottomInset, transitionProperty: "none" } : undefined}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableTaskCard
              key={card.id}
              card={card}
              logged={loggedOf(card.id)}
              muted={!matches(card.id)}
              activelyWorking={isWorking(card.id)}
              onOpen={() => onOpenCard(card.id)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <p className="rounded-[var(--radius-jd-md)] border border-dashed border-[color:var(--jd-control-border)] px-3 py-6 text-center text-xs font-medium text-[color:var(--jd-muted)]">
            Drop a card here
          </p>
        )}
      </div>
    </section>
  );
}
