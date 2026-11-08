"use client";

import { useCallback, useState } from "react";

import { getBacklogRepository } from "../backlog/get-repository";
import type { CardForm } from "../backlog/types";
import type { Copy } from "../i18n";
import type { SummonsItem } from "./summons";
import { announceProblem } from "./summons-toasts";

/** The answer the person opened: a request's inline form, or a card's form to fill. */
export interface OpenAnswer {
  projectId: string;
  item: SummonsItem;
  form: CardForm | null;
}

/**
 * Answering one item (JAVA-1624): a request opens its dialog; a form is fetched and opens Quaestio's
 * runner, when the person is its assignee. A form that is not theirs, or that did not open, says so
 * in a toast. `onChanged` runs when there is nothing to fill any more, so the list moves on.
 */
export function useSummonsAnswer(accountId: string | undefined, copy: Copy["summons"], onChanged: () => void) {
  const [open, setOpen] = useState<OpenAnswer | null>(null);

  const answer = useCallback(
    async (projectId: string, item: SummonsItem) => {
      if (item.kind === "request") {
        setOpen({ projectId, item, form: null });
        return;
      }
      try {
        const detail = await getBacklogRepository().getCard(projectId, item.cardId);
        const mine = accountId !== undefined && detail.assignees.some((a) => a.accountId === accountId);
        if (!mine) announceProblem(copy.notAssignee);
        else if (detail.form?.state === "open") setOpen({ projectId, item, form: detail.form });
        else onChanged();
      } catch {
        announceProblem(copy.openFailed);
      }
    },
    [accountId, copy, onChanged],
  );

  const close = useCallback(() => setOpen(null), []);

  return { open, answer, close };
}
