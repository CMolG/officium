import { STATUS_CONFIG } from "./status-config";
import type { Status } from "./types";

const withStop = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/**
 * What the board says when the server refuses a move (Flx-Shell, "A move the server refused · with its reason"): which
 * card did not move and to where, the server's own reason, and that the card stays where it was. "Couldn't move the
 * card" alone is gone: a refusal always says why.
 */
export function refusalMessage(card: { key: string; status: Status }, to: Status, error: unknown): string {
  const reason = error instanceof Error && error.message.trim() ? withStop(error.message.trim()) : "";
  return [`${card.key} didn't move to ${STATUS_CONFIG[to].label}.`, reason, `It stays in ${STATUS_CONFIG[card.status].label}.`].filter(Boolean).join(" ");
}
