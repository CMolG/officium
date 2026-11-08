"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { differingFaces, mergeChanges, type BoardCard } from "../../../lib/backlog/board-copy";
import { writeBoardCards, type BoardStore } from "../../../lib/backlog/local-store/board-store";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import { useCardsCopy } from "./use-cards-copy";

export interface OpenCards {
  /** The project's open cards; null until the copy or the first catch-up has answered. */
  cards: BoardCard[] | null;
  error: string | null;
  /** Brings the cards up to date: one `changes` read, merged into what is held. */
  catchUp: () => Promise<void>;
  /** The copy has answered (or there is none to read): a surface may now read what the copy lacks. */
  settled: boolean;
  /** The board's copy as it was read: a surface keeps its own parts beside the cards (the epics). */
  store: BoardStore | null;
  /** The account the copy is kept under; null when nothing is kept. */
  accountId: string | null;
}

/**
 * The project's open cards for any surface (JAVA-1633): they paint from the board's local copy,
 * then one catch-up asks the server for what changed since the copy's instant. A surface that
 * needs no closed card reads nothing else. `onChanged` hears the cards each catch-up after the first
 * brought, so a surface can react to one (the Backlog re-reads its epics).
 */
export function useOpenCards({
  projectId,
  repository,
  onChanged,
}: {
  projectId: string | null;
  repository: BacklogRepository;
  onChanged?: (changed: BoardCard[]) => void;
}): OpenCards {
  const copy = useCardsCopy({ projectId, repository });
  const [held, setHeld] = useState<{ key: string; cards: BoardCard[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const cardsRef = useRef<BoardCard[] | null>(null);
  const asOf = useRef<string | null>(null);
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Where the copy is kept, when it is kept at all: an account's copy, in a repository that keeps one.
  const keptBy = repository.persistent && copy.accountId ? copy.accountId : null;

  /** One catch-up at a time: a card event that arrives meanwhile waits for the one running. */
  const catchUp = useCallback((): Promise<void> => {
    const run = async () => {
      if (projectId === null || keyRef.current === null) return;
      const key = keyRef.current;
      const since = asOf.current;
      try {
        const changes = await repository.listChanges(projectId, since ?? undefined);
        // The project changed while the read was in flight: its answer belongs to nobody now.
        if (keyRef.current !== key) return;
        const next = since === null ? changes.cards : mergeChanges(cardsRef.current ?? [], changes);
        asOf.current = changes.asOf;
        setError(null);
        // The first catch-up (no copy yet) brings every open card: a surface reads its own first load, so it hears none of them.
        const differ = differingFaces(cardsRef.current ?? [], changes.cards);
        if (since !== null && differ.length > 0) onChangedRef.current?.(differ);
        if (next === cardsRef.current) return;
        cardsRef.current = next;
        setHeld({ key, cards: next });
        if (keptBy) void writeBoardCards(keptBy, projectId, { asOf: changes.asOf, cards: next }).catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't reach the Officium API.");
      }
    };
    queue.current = queue.current.then(run);
    return queue.current;
  }, [projectId, repository, keptBy]);

  // The copy paints first, once per account and project; the catch-up brings it up to date.
  const settled = copy.state === "ready" || copy.state === "none";
  useEffect(() => {
    if (!settled || keyRef.current === copy.key) return;
    keyRef.current = copy.key;
    cardsRef.current = copy.store?.copy?.cards ?? null;
    asOf.current = copy.store?.copy?.asOf ?? null;
    if (cardsRef.current) setHeld({ key: copy.key, cards: cardsRef.current });
    void catchUp();
  }, [copy, settled, catchUp]);

  return {
    cards: held?.key === copy.key ? held.cards : null,
    error,
    catchUp,
    settled,
    store: copy.store,
    accountId: copy.accountId,
  };
}
