"use client";

import * as React from "react";

/*
 * The state behind `UndoNotice` (JAVA-1296). Shaped like `useConfirmDialog`: the handler that did
 * the reversible thing calls `offer(...)`, and the screen places the node `UndoNotice` draws.
 *
 * There is no timer anywhere in it (WCAG 2.2.1): an offer ends on Dismiss, on `clear()`, on the
 * next `offer()`, or when the owner unmounts.
 */

export interface UndoOffer {
  /** What happened, as a sentence about the object: "3 photos hidden from guests." */
  message: string;
  /** Puts it back. A rejection is a failed undo, shown in words with Try again. */
  undo: () => void | Promise<void>;
  /** The sentence while it is being put back ("Bringing the card back"). Without one, `message` stays. */
  undoing?: string;
  /** The sentence once it is back. Required, so success is never a bare "Undone." */
  undone: string;
  /** The sentence for a failed undo. Defaults to a generic one plus the error's message. */
  failed?: (error: unknown) => string;
}

export type UndoPhase = "offered" | "undoing" | "undone" | "failed";

export interface UndoNoticeState {
  /** Changes with every offer, so the view can tell a new offer from a re-render. */
  id: number;
  offer: UndoOffer;
  phase: UndoPhase;
  /** The failure sentence, while `phase` is `failed`. */
  error?: string;
}

export interface UndoNoticeController {
  state: UndoNoticeState | null;
  offer: (offer: UndoOffer) => void;
  clear: () => void;
  /** Runs the offered undo. A second press while it runs, or after it worked, does nothing. */
  run: () => void;
  /**
   * Shows an offer as already undone, saying its `undone` sentence with no Undo. For an undo that
   * finished in a view which has since unmounted: an undo that goes back to where the thing came
   * back mounts a new view, and that view reports it (JAVA-793).
   */
  settle: (offer: UndoOffer) => void;
}

function failureSentence(offer: UndoOffer, error: unknown): string {
  if (offer.failed) return offer.failed(error);
  const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
  return `Couldn't undo it, so it stays as it is.${detail}`;
}

export function useUndoNotice(): UndoNoticeController {
  const [state, setState] = React.useState<UndoNoticeState | null>(null);
  // The latest state, readable synchronously: two presses in the same tick must see "undoing".
  const current = React.useRef<UndoNoticeState | null>(null);
  const offers = React.useRef(0);

  const commit = React.useCallback((next: UndoNoticeState | null) => {
    current.current = next;
    setState(next);
  }, []);

  const offer = React.useCallback(
    (next: UndoOffer) => {
      offers.current += 1;
      commit({ id: offers.current, offer: next, phase: "offered" });
    },
    [commit],
  );

  const clear = React.useCallback(() => commit(null), [commit]);

  const settle = React.useCallback(
    (next: UndoOffer) => {
      offers.current += 1;
      commit({ id: offers.current, offer: next, phase: "undone" });
    },
    [commit],
  );

  const run = React.useCallback(() => {
    const started = current.current;
    if (!started || (started.phase !== "offered" && started.phase !== "failed")) return;
    commit({ ...started, phase: "undoing", error: undefined });
    void Promise.resolve()
      .then(() => started.offer.undo())
      .then(
        () => {
          // A newer offer replaced this one while it ran: its success is not the new one's news.
          if (current.current?.id === started.id) commit({ ...started, phase: "undone" });
        },
        (error: unknown) => {
          // A failure is shown even then: an undo the person never hears failed about is worse
          // than a lost Undo.
          commit({ ...started, phase: "failed", error: failureSentence(started.offer, error) });
        },
      );
  }, [commit]);

  return React.useMemo(() => ({ state, offer, clear, run, settle }), [state, offer, clear, run, settle]);
}
