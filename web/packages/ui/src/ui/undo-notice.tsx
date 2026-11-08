"use client";

import * as React from "react";
import { focusedElement } from "@javadaba/sdk/platform";

import { cn } from "../lib/cn";
import { Button } from "./button";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { Panel } from "./panel";
import { UndoPhaseShape } from "./undo-phase-shape";
import { Text } from "./text";
import type { UndoNoticeController, UndoNoticeState } from "./use-undo-notice";

/*
 * UndoNotice — the system's answer to "are you sure?" for what can be put back (JAVA-1296).
 *
 * `interface-psychology.md`: a reversible action gets undo, not a confirmation that a routine
 * click automates away. This draws the sentence of what happened and an Undo, anchored where the
 * change is (in flow, never floating: layout floor L1/L2), and it has NO timer: it stays until it
 * is dismissed, replaced by the next offer, or the screen is left. A timed toast takes the
 * person's chance away at the pace of the page, not of the person (WCAG 2.2.1).
 *
 * Use `ConfirmDialog` instead when the action cannot be put back.
 *
 * Labels default to English, as Dialog's "Close" does; a product in another language passes its
 * own.
 */

export interface UndoNoticeLabels {
  undo: string;
  undoing: string;
  retry: string;
  dismiss: string;
}

const DEFAULT_LABELS: UndoNoticeLabels = { undo: "Undo", undoing: "Undoing…", retry: "Try again", dismiss: "Dismiss" };

export interface UndoNoticeProps {
  controller: UndoNoticeController;
  /** `raised` is a box with its own surface, for a notice that sits over content (a canvas). */
  material?: "none" | "raised";
  labels?: Partial<UndoNoticeLabels>;
  className?: string;
}

function sentenceOf(state: UndoNoticeState | null): string {
  if (!state) return "";
  if (state.phase === "undone") return state.offer.undone;
  if (state.phase === "undoing") return state.offer.undoing ?? state.offer.message;
  if (state.phase === "failed") return state.error ?? "";
  return state.offer.message;
}

/**
 * The sentence in a live region that exists before the first offer. The same sentence offered
 * twice is emptied for a tick first: a region whose text did not change announces nothing.
 */
function useSpoken(sentence: string, offerId: number | undefined): string {
  const [spoken, setSpoken] = React.useState("");
  React.useEffect(() => {
    setSpoken("");
    if (!sentence) return;
    const id = setTimeout(() => setSpoken(sentence), 0);
    return () => clearTimeout(id);
  }, [sentence, offerId]);
  return spoken;
}

export function UndoNotice({ controller, material = "none", labels, className }: UndoNoticeProps) {
  const { state, run, clear } = controller;
  const text = { ...DEFAULT_LABELS, ...labels };
  const wrapper = React.useRef<HTMLDivElement>(null);
  const dismissButton = React.useRef<HTMLButtonElement>(null);
  const focusWasInside = React.useRef(false);
  const spoken = useSpoken(sentenceOf(state), state?.id);

  const phase = state?.phase;
  const busy = phase === "undoing";
  const inside = () => {
    const active = focusedElement();
    return !!active && !!wrapper.current?.contains(active);
  };

  // Once undone, the Undo button is gone: a focus that was on it moves to Dismiss, not <body>.
  React.useEffect(() => {
    if (phase === "undoing") return;
    if (phase === "undone" && focusWasInside.current) dismissButton.current?.focus();
    focusWasInside.current = false;
  }, [phase]);

  const dismiss = () => {
    if (busy) return;
    // The next Tab continues from the same place instead of restarting from the top of the page.
    if (inside()) wrapper.current?.focus();
    clear();
  };

  const body = state && (
    <div
      data-state="open"
      className="flex flex-row flex-wrap items-center gap-3 data-[state=open]:animate-jd-fade-in"
      data-testid="undo-notice-row"
    >
      {phase !== "undone" && (
        <Button
          type="button"
          register="ui"
          variant="ghost"
          size="md"
          className="min-h-11"
          aria-disabled={busy || undefined}
          onClick={() => {
            if (busy) return;
            focusWasInside.current = inside();
            run();
          }}
          data-testid="undo-notice-action"
        >
          {!busy && <Glyph name="undo" />}
          {busy ? text.undoing : phase === "failed" ? text.retry : text.undo}
        </Button>
      )}
      <IconButton
        ref={dismissButton}
        large
        aria-label={text.dismiss}
        aria-disabled={busy || undefined}
        onClick={dismiss}
        data-testid="undo-notice-dismiss"
      >
        <Glyph name="x" />
      </IconButton>
    </div>
  );

  const sentence = (
    <div className="flex min-w-0 flex-1 basis-48 flex-row items-center gap-2.5">
      {state && <UndoPhaseShape phase={phase} />}
      <Text as="p" role="status" size="sm" tone="fg" className="min-w-0 flex-1">
        {spoken}
      </Text>
    </div>
  );
  const row = "flex w-full flex-row flex-wrap items-center gap-3";
  const content = (
    <>
      {sentence}
      {body}
    </>
  );

  return (
    <div
      ref={wrapper}
      tabIndex={-1}
      data-testid="undo-notice"
      data-phase={phase ?? "closed"}
      className={cn("outline-none", className)}
    >
      {material === "raised" ? (
        // Closed, the box sheds its surface so the always-mounted live region takes no space.
        <Panel
          material="raised"
          radius="md"
          className={cn(row, state ? "px-4 py-2" : "border-0 bg-transparent p-0 shadow-none")}
        >
          {content}
        </Panel>
      ) : (
        <div className={row}>{content}</div>
      )}
    </div>
  );
}
