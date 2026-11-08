"use client";

import type { BoardCard } from "../../../lib/backlog/board-copy";
import { ELSEWHERE_LIMIT } from "../../../lib/backlog/elsewhere-query";
import { TaskCard } from "../TaskCard";

/** One place's matches, newest first; it says so when there may be more than it shows. */
export function ElsewherePlace({ title, cards, openCard }: { title: string; cards: BoardCard[]; openCard: (keyOrId: string) => Promise<void> }) {
  if (cards.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[color:var(--jd-muted)]">
        {title} · {cards.length}
        {cards.length >= ELSEWHERE_LIMIT ? ", the newest" : ""}
      </p>
      {cards.map((card) => (
        <TaskCard key={card.id} card={card} logged={card.loggedHours} onOpen={() => void openCard(card.id)} />
      ))}
    </div>
  );
}
