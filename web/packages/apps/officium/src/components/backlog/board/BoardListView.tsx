"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { SummonsStackReserve } from "../../summons/SummonsStackReserve";
import { TaskCard } from "../TaskCard";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import { NoBoardMatches } from "./NoBoardMatches";
import type { BoardFilters } from "./use-board-filters";
import type { VisibleCards } from "./use-visible-cards";

export interface BoardListViewProps {
  projectId: string;
  repository: BacklogRepository;
  filters: BoardFilters;
  visible: VisibleCards;
  isWorking: (cardId: string) => boolean;
  openCard: (keyOrId: string) => Promise<void>;
  viewSwitched: boolean;
  insetStyle: React.CSSProperties | undefined;
}

/** Every matching card in one list. */
export function BoardListView({ projectId, repository, filters, visible, isWorking, openCard, viewSwitched, insetStyle }: BoardListViewProps) {
  const { flatFiltered, loggedOf } = visible;
  return (
    <section aria-label="Backlog list" className={`relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 ${viewSwitched ? "officium-rise" : ""}`} style={insetStyle}>
      <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-8">
        {flatFiltered.length === 0 ? (
          <NoBoardMatches repository={repository} projectId={projectId} filters={filters} openCard={openCard} />
        ) : (
          flatFiltered.map((card) => (
            <TaskCard key={card.id} card={card} logged={loggedOf(card.id)} activelyWorking={isWorking(card.id)} onOpen={() => void openCard(card.id)} data-flip-id={card.id} />
          ))
        )}
        <SummonsStackReserve />
      </div>
    </section>
  );
}
