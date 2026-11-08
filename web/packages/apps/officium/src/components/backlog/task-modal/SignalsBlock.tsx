"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { Plus, X } from "lucide-react";

import { Badge, Button, Text } from "@javadaba/ui";

import type { CardDetail, Signal } from "../../../lib/backlog/types";
import { SIGNAL_LABEL, SIGNAL_ORDER } from "../../../lib/backlog/role-config";

export interface SignalsBlockProps {
  detail: CardDetail;
  removedSignal: Signal | null;
  removeSignal: (signal: Signal) => Promise<void>;
  undoRemoveSignal: () => Promise<void>;
  setAddSignalOpen: (open: boolean) => void;
}

/** The card's signals, with the picker to add one and the undo for a removal. */
export function SignalsBlock({ detail, removedSignal, removeSignal, undoRemoveSignal, setAddSignalOpen }: SignalsBlockProps) {
  return (
    <div>
      <h3 id="card-signals-heading" className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">
        Signals
      </h3>
      {/* JAVA-294: what about the work brings roles its category alone does not. JAVA-521: a
          signal changes who may work the card, so none flips on or off with a single tap --
          adding goes through a picker that says what it brings, removing is its own button,
          and a removal can be undone. */}
      {detail.signals.length > 0 ? (
        <>
          <ul data-testid="card-signals" aria-labelledby="card-signals-heading" className="flex flex-row flex-wrap gap-1.5">
            {SIGNAL_ORDER.filter((s) => detail.signals.includes(s)).map((signal) => (
              <li key={signal} data-signal={signal} className="flex min-w-0 max-w-full flex-row items-center">
                {/* The longest label beside a 44 px button is wider than the sidebar column:
                    the label wraps so the chip stays inside it, and the button never shrinks
                    below its 44 px touch target (layout floor L3). */}
                <Badge tone="neutral" fill="subtle" register="tag" className="min-w-0 whitespace-normal leading-snug">
                  {SIGNAL_LABEL[signal]}
                </Badge>
                <Button
                  type="button"
                  register="ui"
                  size="icon"
                  variant="ghost"
                  className="size-11 shrink-0"
                  aria-label={`Remove signal ${SIGNAL_LABEL[signal]}`}
                  title={`Remove ${SIGNAL_LABEL[signal]}, and the roles it brings`}
                  onClick={() => void removeSignal(signal)}
                >
                  <X size={14} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-[color:var(--jd-muted)]">Removing a signal also removes the roles it brings.</p>
        </>
      ) : (
        <p data-testid="card-signals-empty" className="text-xs text-[color:var(--jd-muted)]">
          None yet.
        </p>
      )}
      {removedSignal && (
        <p role="status" data-testid="card-signal-removed" className="mt-1 flex flex-row items-center gap-2 text-xs">
          <Text>{SIGNAL_LABEL[removedSignal]} removed.</Text>
          <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0" onClick={() => void undoRemoveSignal()}>
            <Text>Undo</Text>
          </Button>
        </p>
      )}
      {detail.signals.length < SIGNAL_ORDER.length ? (
        <Button
          type="button"
          register="ui"
          size="sm"
          variant="outline"
          className="mt-2 min-h-11"
          onClick={() => setAddSignalOpen(true)}
        >
          <Plus size={14} aria-hidden="true" /> <Text>Add signal</Text>
        </Button>
      ) : (
        <p className="mt-2 text-xs text-[color:var(--jd-muted)]">It has every signal there is.</p>
      )}
    </div>
  );
}
