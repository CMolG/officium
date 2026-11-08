"use client";

import * as React from "react";

import { Glyph } from "./glyph";
import type { ToastLabels } from "./toast.shared";

export interface ToastStripProps {
  labels: ToastLabels;
  /** Every toast the stack holds, waiting ones included. */
  count: number;
  /** The toasts, drawn in flow under the strip once the person asks to read them. */
  children: React.ReactNode;
}

/**
 * What a dialog shows of the toast stack (Lib-Overlays § toast.waiting): only how many wait, never a
 * toast over the dialog's own content. "Show" opens them in place, inside the dialog's focus trap, in
 * the flow under the strip, so nothing floats over a form being filled.
 */
export function ToastStrip({ labels, count, children }: ToastStripProps) {
  const [shown, setShown] = React.useState(false);
  const listId = React.useId();
  return (
    <div className="pointer-events-auto flex w-full flex-col gap-2">
      <div className="flex min-h-11 flex-row items-center justify-between gap-2.5 rounded-xl bg-[color:var(--jd-card)] pl-3.5 pr-2 text-[13px] font-semibold text-[color:var(--jd-ink)]">
        <span role="status" className="flex flex-row items-center gap-2">
          <Glyph name="info-circle" size={16} />
          {labels.waitingInDialog(count)}
        </span>
        <button
          type="button"
          aria-expanded={shown}
          aria-controls={listId}
          onClick={() => setShown(!shown)}
          className="min-h-11 cursor-pointer rounded-lg px-2 font-semibold underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-focus)]"
        >
          {shown ? labels.hide : labels.show}
        </button>
      </div>
      <div id={listId} hidden={!shown} className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}
