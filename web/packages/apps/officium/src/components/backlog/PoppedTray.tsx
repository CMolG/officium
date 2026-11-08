"use client";

import { Bot, Hourglass } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import { AgentWorkRow, type AgentWorkToastItem } from "./AgentWorkRow";
import { useOpenRequests } from "./CardRequestsContext";

/**
 * What the pop-out window holds (Off-Board, "What it holds"): each card the AI works with its step, what needs the person
 * with Answer, and a way back to the board. It renders in the other window through a portal, so it shares the page's
 * state: Open and Answer open the card in the board's own tab.
 */
export function PoppedTray({ items, onOpen, onBack }: { items: AgentWorkToastItem[]; onOpen: (cardId: string) => void; onBack: () => void }) {
  const requests = useOpenRequests();
  return (
    <section aria-label="AI at work" data-testid="popped-tray" className="flex min-h-full flex-col bg-[color:var(--jd-raised)] text-[color:var(--jd-ink)]">
      <header className="flex flex-row items-center gap-2 border-b border-[color:var(--jd-line)] px-4 py-3">
        <Bot size={16} className="shrink-0 text-[color:var(--officium-agent)]" aria-hidden="true" />
        <Text as="h1" className="flex-1 text-sm font-semibold">
          {items.length === 0 ? "Nothing at work right now" : `AI is working on ${items.length} ${items.length === 1 ? "card" : "cards"}`}
        </Text>
        <Button type="button" register="ui" variant="outline" size="sm" onClick={onBack}>
          Back to the board
        </Button>
      </header>
      {items.length === 0 && <Text className="px-4 py-3 text-sm text-[color:var(--jd-muted)]">The cards an agent starts will show here.</Text>}
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map(({ work, card }) => (
          <AgentWorkRow key={work.cardId} work={work} card={card} onOpen={() => onOpen(card.id)} />
        ))}
      </ul>
      {requests.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[color:var(--jd-line)] px-4 py-3">
          <Text as="h2" className="flex flex-row items-center gap-1.5 text-sm font-bold">
            <Hourglass size={14} aria-hidden="true" /> Needs you · {requests.length}
          </Text>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-row items-center gap-3">
                <Text className="min-w-0 flex-1 truncate text-sm">
                  {request.cardKey} · {request.action}
                </Text>
                <Button type="button" register="ui" size="sm" onClick={() => onOpen(request.cardId)}>
                  Answer
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
