"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { Link } from "@javadaba/ui/navigation";
import { Plug } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import { configurationPath } from "../../../lib/configuration/places";
import type { ViewMode } from "../TopBar";
import { AgentWorkToast } from "../AgentWorkToast";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import { BoardColumnsView } from "./BoardColumnsView";
import { NoBoardMatches } from "./NoBoardMatches";
import { BoardListView } from "./BoardListView";
import { BoardStackView } from "./BoardStackView";
import type { AgentWorkState } from "./use-agent-work";
import type { BoardDrag } from "./use-board-drag";
import type { BoardFilters } from "./use-board-filters";
import type { LiveSync } from "./use-live-sync";
import type { OpenCard } from "./use-open-card";
import type { VisibleCards } from "./use-visible-cards";

export interface BoardCardsAreaProps {
  projectId: string;
  /** Where a search that matches nothing on the board looks next (JAVA-2046). */
  repository: BacklogRepository;
  sync: LiveSync;
  agent: AgentWorkState;
  open: OpenCard;
  drag: BoardDrag;
  filters: BoardFilters;
  visible: VisibleCards;
  viewMode: ViewMode | null;
  inTheater: boolean;
  toastInset: number;
  setToastInset: (inset: number) => void;
  insetStyle: React.CSSProperties | undefined;
  viewSwitched: boolean;
  setNewCardOpen: (open: boolean) => void;
  /** The active sprint is not known yet: the area waits, as it does for the cards. */
  sprintPending: boolean;
}

/** The cards' area: the load error, the empty states and the view the person picked, with the agents' tray floating over it. */
export function BoardCardsArea({ projectId, repository, sync, agent, open, drag, filters, visible, viewMode, inTheater, toastInset, setToastInset, insetStyle, viewSwitched, setNewCardOpen, sprintPending }: BoardCardsAreaProps) {
  const { cards, loadError, schedule } = sync;
  const { isWorking, workingItems } = agent;
  const { openCard } = open;
  // Filters that match nothing say so above the view, in every layout (Off-Board, "Nothing matches"): the board keeps
  // its shape (cards dim), the stack its status groups, and the list says it in place.
  const nothingMatches = cards !== null && cards.length > 0 && viewMode !== null && viewMode !== "list" && filters.filtering && visible.visibleCount === 0;
  // The cards' area. The floating agents' strip is positioned against THIS box, not the whole
  // board: it may cover cards (their scroll areas make room for it), never the toolbar above
  // -- on a phone, under the product bar, that toolbar is most of the screen.
  // Never less than most of a phone's screen: whatever sits above it, the cards stay reachable.
  return (
    <div className={`relative flex min-h-0 flex-1 flex-col ${inTheater ? "" : "max-lg:min-h-[75dvh] lg:min-h-[28rem]"}`}>
      {nothingMatches && (
        <div className="shrink-0 px-4 pt-4 sm:px-6">
          <NoBoardMatches repository={repository} projectId={projectId} filters={filters} openCard={openCard} />
        </div>
      )}
      {loadError ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
          <p className="text-sm font-semibold text-[color:var(--jd-ink)]">Couldn't load this board</p>
          <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-muted)]">{loadError}</p>
          <Button type="button" register="ui" onClick={() => void schedule("all")}>
            Try again
          </Button>
        </div>
      ) : cards === null || viewMode === null || sprintPending ? (
        <div className="flex flex-row min-h-0 flex-1 items-center justify-center text-sm text-[color:var(--jd-muted)]"><Text>Loading the backlog…</Text></div>
      ) : cards.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-semibold text-[color:var(--jd-ink)]">No cards yet</p>
          <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-muted)]">
            Cards created here, or by an AI agent through MCP, show up on this board.
          </p>
          <div className="flex flex-row flex-wrap items-center justify-center gap-2">
            <Button type="button" register="ui" size="sm" onClick={() => setNewCardOpen(true)}>
              New card
            </Button>
            {/* JDB-227: the empty state is where "or by an AI agent" above needs a next step. */}
            <Button asChild type="button" register="ui" variant="ghost" size="sm">
              <Link href={configurationPath("integrations", projectId)}>
                <Plug size={14} /> Connect an agent
              </Link>
            </Button>
          </div>
        </div>
      ) : viewMode === "board" ? (
        <BoardColumnsView
          drag={drag}
          filters={filters}
          visible={visible}
          isWorking={isWorking}
          openCard={openCard}
          inTheater={inTheater}
          viewSwitched={viewSwitched}
          toastInset={toastInset}
        />
      ) : viewMode === "list" ? (
        <BoardListView projectId={projectId} repository={repository} filters={filters} visible={visible} isWorking={isWorking} openCard={openCard} viewSwitched={viewSwitched} insetStyle={insetStyle} />
      ) : (
        <BoardStackView filters={filters} visible={visible} isWorking={isWorking} openCard={openCard} viewSwitched={viewSwitched} insetStyle={insetStyle} />
      )}
      {/* Below `lg` the board grows and the shell's box scrolls it, so the cards' area ends where
          the content does: docked to it, the tray sat at the end of a long stack (JAVA-223). It
          docks to the screen there instead; the Theater's frame never grows, and keeps it. */}
      <AgentWorkToast items={workingItems} onOpen={(id) => void openCard(id)} onInsetChange={setToastInset} dock={inTheater ? "container" : "screen-below-lg"} />
    </div>
  );
}
