"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { Card, CardDetail } from "../../../lib/backlog/types";
import { useCurrentAccountId } from "../../../lib/backlog/use-current-account";
import type { ConflictInfo } from "../ConflictDialog";
import { useCardComments } from "./use-card-comments";
import { useCardSignals } from "./use-card-signals";
import { useCardSprint } from "./use-card-sprint";
import { useCardTextEditing } from "./use-card-text-editing";
import { useCardWrites } from "./use-card-writes";
import { useLinkableCards } from "./use-linkable-cards";

export interface CardPanelInput {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  allCards: Omit<Card, "description" | "actionPlan">[];
  onChanged: (next: CardDetail) => void | Promise<void>;
  onConflict?: (info: ConflictInfo) => void;
}

/**
 * Everything a card's view writes through: the modal and the card's own page both call this, so an
 * edit is the same code in either. The modal also reads `text` for its Escape and outside-click
 * guards, which is why the hooks live here and not inside `CardPanel`.
 */
export function useCardPanel({ projectId, repository, detail, allCards, onChanged, onConflict }: CardPanelInput) {
  const accountId = useCurrentAccountId();
  const writes = useCardWrites({ projectId, repository, detail, onChanged, onConflict });
  const { setError, reportConflict } = writes;
  const text = useCardTextEditing({ projectId, repository, detail, onChanged, reportConflict, setError });
  const comments = useCardComments({ projectId, repository, detail, onChanged, setError });
  const signals = useCardSignals({ projectId, repository, detail, onChanged, reportConflict });
  const { sprints, sprint } = useCardSprint({ projectId, repository, detail });
  const linkable = useLinkableCards({ projectId, repository, detail, allCards });
  const [timeTrackingOpen, setTimeTrackingOpen] = useState(false);
  return { accountId, writes, text, comments, signals, sprints, sprint, linkable, timeTrackingOpen, setTimeTrackingOpen };
}

export type CardPanelState = ReturnType<typeof useCardPanel>;
