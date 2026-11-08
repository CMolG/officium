"use client";

import { Bot, ExternalLink } from "lucide-react";

import { Button, FloatingTray, Text, useTheaterScene, type FloatingTrayProps } from "@javadaba/ui";

import { useAgentTrayOpen } from "../../lib/backlog/agent-tray-pref";
import { AgentWorkRow, type AgentWorkToastItem } from "./AgentWorkRow";
import { focusMainWindow } from "../../lib/shell/pop-out";
import { PopOutPortal } from "./PopOutPortal";
import { PoppedTray } from "./PoppedTray";
import { usePopOut } from "./use-pop-out";

/**
 * Floating strip at the bottom of the board listing every card an agent is actively working on
 * right now (officium-api.md §4.1), each with its latest status and an "Open" that opens the
 * card's modal. It only exists while there is work to show; it starts collapsed to its count
 * (expanded, it covers at most a third of the board and its list scrolls inside), and the viewer's
 * choice is remembered.
 *
 * It floats OVER the board (user decision, 2026-09-15) on `@javadaba/ui`'s `FloatingTray`: the
 * columns keep their full height and only their scroll areas grow room at the bottom
 * (`onInsetChange`), so the last card can still be scrolled out from under the strip.
 */
export function AgentWorkToast({
  items,
  onOpen,
  onInsetChange,
  dock,
}: {
  items: AgentWorkToastItem[];
  onOpen: (cardId: string) => void;
  /** The height (px) the list covers at the bottom of the board, 0 when it isn't shown -- so
   *  the board can pad its scroll areas and no card stays trapped underneath it. */
  onInsetChange?: (px: number) => void;
  dock?: FloatingTrayProps["dock"];
}) {
  // Starts collapsed (JAVA-1547) and remembers the viewer's choice.
  const [trayOpen, setTrayOpen] = useAgentTrayOpen();
  const popOut = usePopOut("Officium · AI at work");
  // The product page's Theater plays this tray inside the landing: a window of its own makes no sense there.
  const inTheater = useTheaterScene() !== null;
  const popOutButton = (
    <Button type="button" register="ui" variant="outline" size="sm" className="shrink-0 bg-[color:var(--jd-raised)]" onClick={() => void popOut.open()}>
      <ExternalLink size={14} aria-hidden="true" />
      Pop out
    </Button>
  );
  // Back in the tab, the window closes and the tray returns; a card opened from the window opens here.
  const openHere = (cardId: string) => {
    focusMainWindow();
    onOpen(cardId);
  };
  return (
    <>
      <FloatingTray
        open={items.length > 0 && !popOut.popped}
        label="AI agents working now"
        icon={<Bot size={16} className="shrink-0 text-[color:var(--officium-agent)]" aria-hidden="true" />}
        title="AI is working on these cards right now:"
        collapsedTitle={`AI is working on ${items.length} ${items.length === 1 ? "card" : "cards"}`}
        expandLabel="Show the cards"
        collapseLabel="Hide the cards"
        collapsed={!trayOpen}
        onCollapsedChange={(collapsed) => setTrayOpen(!collapsed)}
        onInsetChange={onInsetChange}
        dock={dock}
        toggleTarget="agent-work-toggle"
        actions={inTheater ? undefined : popOutButton}
      >
        <ul className="flex flex-col">
          {items.map(({ work, card }) => (
            <AgentWorkRow key={work.cardId} work={work} card={card} onOpen={() => onOpen(card.id)} />
          ))}
        </ul>
        {popOut.blocked && (
          <Text role="alert" className="px-4 py-2 text-xs text-[color:var(--jd-muted)]">
            The browser blocked the window. Allow pop-ups for this site and try again.
          </Text>
        )}
      </FloatingTray>
      {popOut.popped && (
        <PopOutPortal popped={popOut.popped}>
          <PoppedTray
            items={items}
            onOpen={openHere}
            onBack={() => {
              focusMainWindow();
              popOut.close();
            }}
          />
        </PopOutPortal>
      )}
    </>
  );
}
