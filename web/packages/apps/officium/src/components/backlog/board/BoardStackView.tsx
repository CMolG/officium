"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { Bot } from "lucide-react";

import { STATUS_CONFIG, STATUS_ORDER } from "../../../lib/backlog/status-config";
import { SummonsStackReserve } from "../../summons/SummonsStackReserve";
import { TaskCard } from "../TaskCard";
import type { BoardFilters } from "./use-board-filters";
import type { VisibleCards } from "./use-visible-cards";

export interface BoardStackViewProps {
  filters: BoardFilters;
  visible: VisibleCards;
  isWorking: (cardId: string) => boolean;
  openCard: (keyOrId: string) => Promise<void>;
  viewSwitched: boolean;
  insetStyle: React.CSSProperties | undefined;
}

/** The cards stacked by status, with what an agent works on leading. */
export function BoardStackView({ filters, visible, isWorking, openCard, viewSwitched, insetStyle }: BoardStackViewProps) {
  const { matches, activeStatuses } = filters;
  const { stackWorking, boardGroups, loggedOf } = visible;
  return (
    <section aria-label="Backlog stack" className={`relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 ${viewSwitched ? "officium-rise" : ""}`} style={insetStyle}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-8">
        {/* What an agent is working on right now leads the stack (JAVA-223), so following its
            progress on a phone isn't a hunt through every status. Each card keeps its status
            badge, and it is listed here only, never twice. */}
        {stackWorking.length > 0 && (
          <div role="group" aria-labelledby="stack-working-heading" className="flex flex-col gap-2.5">
            <h2 id="stack-working-heading" className="flex flex-row items-center gap-2 text-sm font-semibold text-[color:var(--jd-ink)]">
              <Bot size={14} className="shrink-0 text-[color:var(--officium-agent)]" aria-hidden="true" />
              AI working now
              <span className="text-xs font-medium text-[color:var(--jd-muted)]">{stackWorking.length}</span>
            </h2>
            {stackWorking.map((card) => (
              <TaskCard key={card.id} card={card} logged={loggedOf(card.id)} activelyWorking onOpen={() => void openCard(card.id)} data-flip-id={card.id} />
            ))}
          </div>
        )}
        {STATUS_ORDER.map((status) => {
          const group = boardGroups[status].filter((card) => matches(card) && !isWorking(card.id));
          if (activeStatuses.length > 0 && !activeStatuses.includes(status)) return null;
          const config = STATUS_CONFIG[status];
          return (
            <div key={status} className="flex flex-col gap-2.5">
              <h2 className="flex flex-row items-center gap-2 text-sm font-semibold text-[color:var(--jd-ink)]">
                {config.label}
                <span className="text-xs font-medium text-[color:var(--jd-muted)]">{group.length}</span>
              </h2>
              {group.length === 0 ? (
                <p className="rounded-[var(--radius-jd-md)] border border-dashed border-[color:var(--jd-line)] px-3 py-4 text-xs text-[color:var(--jd-faint)]">
                  Nothing here.
                </p>
              ) : (
                group.map((card) => (
                  <TaskCard key={card.id} card={card} logged={loggedOf(card.id)} activelyWorking={isWorking(card.id)} onOpen={() => void openCard(card.id)} data-flip-id={card.id} />
                ))
              )}
            </div>
          );
        })}
        <SummonsStackReserve />
      </div>
    </section>
  );
}
