// "Your first board": Officium's guided tour (Off-Tour, Library 15), five steps on the core tour.
// It opens once, the first time a project's board opens (`useAutoBoardTour`, from the board's
// surface), and again from Help in the sidebar (`useReplayBoardTour`, "Replay the tour"). The
// engine owns the spotlight, the card, the keys and the "seen" record.
//
// Web only: the tour lights parts of a page by selector and has no Android twin (its `.native`
// pair does nothing), so the ported app surface never imports `@javadaba/ui/tour` itself.
//
// Targets are the board's own landmarks, by the names a screen reader already hears. A part that
// is not on screen (the Needs you lane while nothing needs you) shows its step centered, without a
// spotlight. A phone draws the board as a stack, so the steps about a column and the sidebar are
// skipped there.

import { useEffect, useState } from "react";
import { defineTour, useAutoTour, useTour } from "@javadaba/ui/tour";

const FIRST_BOARD_TOUR_ID = "officium-first-board";

/** A card on whichever layout the board is in (columns, list or stack). */
const A_CARD = '[aria-label^="Backlog "] article';

/** How often the page is looked at while the board has no cards on it yet. */
const POLL_MS = 300;

defineTour({
  id: FIRST_BOARD_TOUR_ID,
  name: "Your first board",
  brand: "officium",
  steps: [
    {
      id: "board",
      target: '[aria-label="Backlog board"], [aria-label="Backlog stack"], [aria-label="Backlog list"]',
      title: "One board, people and agents",
      body: "Cards move through phases, worked by people and AI agents at the same time.",
      placement: "auto",
    },
    {
      id: "refine",
      target: '[aria-label="Refine column"]',
      title: "The plan gate",
      body: "An AI card needs a workflow and an action plan before it leaves Refine.",
      placement: "right",
      hiddenOnPhone: true,
    },
    {
      id: "card",
      target: A_CARD,
      title: "Everything about a card",
      body: "Open one to see who may work it, its plan, its time and its links.",
      placement: "right",
    },
    {
      id: "needs-you",
      target: '[aria-label="Needs you"]',
      title: "What only you can do",
      body: "Cards for a person, an agent's requests and forms to answer land here.",
      placement: "bottom",
    },
    {
      id: "connect",
      target: 'nav[aria-label^="Workspace"] a[href*="/app/configuration"]',
      title: "Bring your agent",
      body: "Agents join through the MCP server, signed in with your Javadaba account.",
      placement: "right",
      hiddenOnPhone: true,
    },
  ],
});

/**
 * Opens the tour once, the first time a board with cards on it is on screen and the page is quiet.
 * It waits for a card because a tour that opens before the part it lights exists shows its step
 * centered, in the wrong place; the board's cards arrive through the client's own data load and
 * announce themselves nowhere, so the page is looked at.
 */
export function useAutoBoardTour(): void {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.querySelector(A_CARD)) {
        setReady(true);
        clearInterval(timer);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);
  useAutoTour(FIRST_BOARD_TOUR_ID, { ready });
}

/** The entry that plays the tour again: `start` from Help in the sidebar. */
export function useReplayBoardTour(): { start: () => void } {
  return useTour(FIRST_BOARD_TOUR_ID);
}
