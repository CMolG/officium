"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useCallback, useMemo } from "react";

import { compareCards, groupByStatus } from "../../../lib/backlog/board-order";
import type { BoardCard } from "../../../lib/backlog/board-copy";
import type { Sprint } from "../../../lib/backlog/types";
import type { ViewMode } from "../TopBar";
import type { BoardFilters } from "./use-board-filters";

export interface VisibleCardsInput {
  cards: BoardCard[] | null;
  previewCards: BoardCard[] | null;
  /** `undefined` while the sprint scope is not known yet: no card shows meanwhile (JAVA-1575). */
  activeSprint: Sprint | null | undefined;
  filters: BoardFilters;
  viewMode: ViewMode | null;
  isWorking: (cardId: string) => boolean;
}

/** The cards each view shows: scoped to the sprint, grouped, filtered, sorted and counted. */
export function useVisibleCards({ cards, previewCards, activeSprint, filters, viewMode, isWorking }: VisibleCardsInput) {
  const { matches, filtering, activeStatuses, sortKey } = filters;
  // Hours ride on each card (`loggedHours`): no timesheet read.
  const loggedByCard = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c.loggedHours])), [cards]);
  const loggedOf = useCallback((cardId: string) => loggedByCard.get(cardId) ?? 0, [loggedByCard]);

  const displayCards = useMemo(() => {
    const base = previewCards ?? cards ?? [];
    // Until the sprint is known, nothing shows: the whole backlog is never the first picture.
    if (activeSprint === undefined) return [];
    // officium-api.md §8.2: with an active sprint, the board is scoped to IT -- with none, every
    // card, exactly as before sprints existed, so nothing disappears from a board on deploy.
    return activeSprint ? base.filter((card) => card.sprintId === activeSprint.id) : base;
  }, [previewCards, cards, activeSprint]);

  const compare = useMemo(() => compareCards(sortKey, loggedOf), [sortKey, loggedOf]);

  // Deploy is shown whole: since Completed exists (2026-09-23) it holds only what is waiting to
  // reach production. It used to hold every finished card, so it showed the latest ten.
  // The cards an agent works on now lead their column (JAVA-584, as they lead the stack, JAVA-223):
  // following the agents is what the board is watched for. While a filter is on, the cards it
  // matches rise right below them (JAVA-47, user request 2026-09-24), in the sort's order among
  // themselves; the dimmed rest follow. Otherwise a match at the bottom of a long column meant
  // scrolling to find it.
  const boardGroups = useMemo(
    () =>
      groupByStatus(
        displayCards,
        (a, b) =>
          Number(!isWorking(a.id)) - Number(!isWorking(b.id))
          || (filtering ? Number(!matches(a)) - Number(!matches(b)) : 0)
          || compare(a, b),
      ),
    [displayCards, compare, filtering, matches, isWorking],
  );

  const flatFiltered = useMemo(
    () =>
      displayCards
        .filter((card) => matches(card) && (activeStatuses.length === 0 || activeStatuses.includes(card.status)))
        .sort(compare),
    [displayCards, matches, activeStatuses, compare],
  );

  // The stack view's leading group: the cards an agent works on now, in the view's filter and sort.
  const stackWorking = useMemo(() => flatFiltered.filter((card) => isWorking(card.id)), [flatFiltered, isWorking]);

  const visibleCount = viewMode === "board" ? displayCards.filter(matches).length : flatFiltered.length;
  const loggedTotal =
    viewMode === "board"
      ? displayCards.filter(matches).reduce((sum, c) => sum + loggedOf(c.id), 0)
      : flatFiltered.reduce((sum, c) => sum + loggedOf(c.id), 0);

  return { loggedOf, displayCards, boardGroups, flatFiltered, stackWorking, visibleCount, loggedTotal };
}

export type VisibleCards = ReturnType<typeof useVisibleCards>;
