"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useCallback, useEffect, useState } from "react";
import type { useRouter, useSearchParams } from "@javadaba/ui/navigation";

import { boardPath, cardPath } from "../../../lib/backlog/search-links";
import type { BoardCard } from "../../../lib/backlog/board-copy";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { CardDetail } from "../../../lib/backlog/types";

export interface OpenCardInput {
  projectId: string;
  repository: BacklogRepository;
  cards: BoardCard[] | null;
  searchParams: ReturnType<typeof useSearchParams>;
  router: ReturnType<typeof useRouter>;
  /** The Theater plays this board inside the landing, and must not touch the page's address. */
  inTheater: boolean;
}

/** The open card, the board's error banner, and the deep link that opens a card on arrival. */
export function useOpenCard({ projectId, repository, cards, searchParams, router, inTheater }: OpenCardInput) {
  const [error, setErrorMessage] = useState<string | null>(null);
  // The card a refusal is about, so its banner can open it (Flx-Shell, "A move the server refused").
  const [errorCardId, setErrorCardId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CardDetail | null>(null);

  const setError = useCallback((message: string | null, cardId?: string) => {
    setErrorMessage(message);
    setErrorCardId(message === null ? null : (cardId ?? null));
  }, []);

  const notFound = useCallback((key: string) => {
    setError(`Card ${key} doesn't exist in this project, or it was deleted. Check the key, or pick the card on the board.`);
  }, [setError]);

  // Takes an id or a key: a completed card is not on the board, so a link to one only has its key.
  const openCard = useCallback(
    async (keyOrId: string) => {
      try {
        setSelectedDetail(await repository.getCard(projectId, keyOrId));
      } catch {
        notFound(keyOrId);
      }
    },
    [projectId, repository, notFound],
  );

  // Opening a card here never touches the address (JAVA-1567): the modal keeps the board's route
  // and the card's own page is a page of its own. The older deep links still work
  // (`?card=<id-or-key>`, from Adiutor, bookmarks, the desktop's `view=card`,
  // `doc://contracts/desktop-deeplinks` §6): they go to that page. A card that is not on the
  // board -- a completed one -- still resolves: `getCard` takes the key as well as the id.
  useEffect(() => {
    const cardParam = searchParams.get("card");
    if (!cardParam || cards === null || inTheater) return;
    const match = cards.find((c) => c.id === cardParam || c.key === cardParam);
    void (match ? Promise.resolve(match.key) : repository.getCard(projectId, cardParam).then((c) => c.key))
      .then((key) => {
        router.replace(cardPath(projectId, key));
      })
      .catch(() => {
        notFound(cardParam);
        router.replace(boardPath(projectId));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const closeCard = useCallback(() => setSelectedDetail(null), []);

  return { selectedDetail, setSelectedDetail, error, errorCardId, setError, openCard, closeCard };
}

export type OpenCard = ReturnType<typeof useOpenCard>;
