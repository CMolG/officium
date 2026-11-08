"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { DndContext, DragOverlay } from "@dnd-kit/core";

import { Panel } from "@javadaba/ui";

import { STATUS_ORDER } from "../../../lib/backlog/status-config";
import { SummonsStackReserve } from "../../summons/SummonsStackReserve";
import { Column } from "../Column";
import { TaskCard } from "../TaskCard";
import type { BoardDrag } from "./use-board-drag";
import type { BoardFilters } from "./use-board-filters";
import type { VisibleCards } from "./use-visible-cards";

export interface BoardColumnsViewProps {
  drag: BoardDrag;
  filters: BoardFilters;
  visible: VisibleCards;
  isWorking: (cardId: string) => boolean;
  openCard: (keyOrId: string) => Promise<void>;
  inTheater: boolean;
  viewSwitched: boolean;
  toastInset: number;
}

/** The status columns, with drag and drop between them. */
export function BoardColumnsView({ drag, filters, visible, isWorking, openCard, inTheater, viewSwitched, toastInset }: BoardColumnsViewProps) {
  const { sensors, handleDragStart, handleDragOver, handleDragEnd, setPreviewCards, setActiveDragCard, activeDragCard } = drag;
  const { matches, liftKey } = filters;
  const { boardGroups, displayCards, loggedOf } = visible;
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setPreviewCards(null);
        setActiveDragCard(null);
      }}
    >
      {/* Below `lg` the app stacks the columns and nothing scrolls sideways (JAVA-127, user
          report 2026-09-26): the shell's box is the one scroller, downwards. The Theater keeps
          the rail at every width -- it draws the desktop composition scaled into its frame,
          and its cursor drags between side-by-side columns -- where a sideways swipe settles
          on a column (JAVA-59), never during a drag: dnd-kit scrolls the board in small steps
          while a card is held at its edge, and a mandatory snap would pull each step back. */}
      <section
        aria-label="Backlog board"
        className={`relative min-h-0 flex-1 px-4 py-4 sm:px-6 ${inTheater ? `overflow-x-auto overflow-y-hidden ${activeDragCard ? "" : "max-lg:snap-x max-lg:snap-mandatory max-lg:scroll-px-4 sm:max-lg:scroll-px-6"}` : "lg:overflow-x-auto lg:overflow-y-hidden"} ${viewSwitched ? "officium-rise" : ""}`}
      >
        <div className={inTheater ? "flex flex-row h-full min-w-max gap-3" : "flex flex-col gap-3 lg:h-full lg:min-w-max lg:flex-row"}>
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              cards={boardGroups[status]}
              bottomInset={toastInset}
              loggedOf={loggedOf}
              matches={(cardId) => {
                const card = displayCards.find((c) => c.id === cardId);
                return !card || matches(card);
              }}
              isWorking={isWorking}
              onOpenCard={(id) => void openCard(id)}
              liftKey={liftKey}
              stacked={!inTheater}
            />
          ))}
        </div>
        <SummonsStackReserve />
      </section>
      <DragOverlay>
        {activeDragCard && (
          <Panel material="raised" radius="lg" className="w-70">
            <TaskCard card={activeDragCard} logged={loggedOf(activeDragCard.id)} compact onOpen={() => {}} />
          </Panel>
        )}
      </DragOverlay>
    </DndContext>
  );
}
