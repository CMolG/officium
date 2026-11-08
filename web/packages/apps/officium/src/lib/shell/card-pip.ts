import type { PipWidget } from "@javadaba/sdk";

import { STATUS_CONFIG } from "../backlog/status-config";
import type { CardDetail } from "../backlog/types";

/** The agent working a card right now: its name and the last thing it said it was doing. */
export interface PipWorker {
  who: string;
  line: string | null;
}

/**
 * What Officium draws for Picture in picture (OS-Windows, "Each app draws its own"): the card the person has open, as
 * its key and title, what is happening to it in one line and its state as a chip, so state is never only a color. An
 * agent working it says so ("Working now", with the agent's last status line); otherwise the chip is the card's status.
 */
export function cardPipWidget(card: Pick<CardDetail, "key" | "title" | "status">, worker: PipWorker | null): PipWidget {
  const title = `${card.key} · ${card.title}`;
  if (!worker) return { title, status: { label: STATUS_CONFIG[card.status].label } };
  return { title, detail: worker.line ?? `${worker.who} is working on it`, status: { label: "Working now", tone: "working" } };
}
