"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { ToastGlyph } from "./toast-glyph";
import type { ToastItem as Item } from "./toast-store";
import type { ToastLabels } from "./toast.shared";

export interface ToastItemProps {
  item: Item;
  labels: ToastLabels;
  onDismiss: (id: string) => void;
  onEscape: (id: string) => void;
  /** Placement in a collapsed stack (the newest is 0); the style that scales it back and fades it. */
  style?: React.CSSProperties;
  /** A toast peeking behind the front one is decoration to assistive tech: the front one is the news. */
  behind?: boolean;
}

/** The ink-on-washi link an action is drawn as, inside the one line. */
const LINK =
  "shrink-0 cursor-pointer rounded-sm font-semibold underline underline-offset-4 hover:decoration-2 pointer-coarse:min-h-11 pointer-coarse:px-1.5 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-page)]";

/**
 * One toast: 44 px, one line, in the ink (Lib-Overlays § toast.stack): the product's icon or the
 * variant's shape, "App · the news" ellipsed (the full text is the tooltip), the action as a link and
 * a dismiss. It never takes focus on arrival; an action and a cancel dismiss the toast after they run;
 * Escape on any control inside it dismisses that toast only (the dialog under it stays open).
 */
export function ToastItem({ item, labels, onDismiss, onEscape, style, behind = false }: ToastItemProps) {
  const news = [item.title, item.description].filter(Boolean).join(" ");
  const press = (action: NonNullable<Item["action"]>) => () => {
    action.onClick();
    onDismiss(item.id);
  };
  return (
    <div
      data-toast-id={item.id}
      data-state={item.state}
      data-variant={item.variant}
      aria-hidden={behind || undefined}
      inert={behind || undefined}
      style={style}
      className={cn(
        "pointer-events-auto w-full transition-[top,scale,opacity] duration-[var(--jd-dur-base)] ease-[var(--ease-jd)] data-[state=closing]:pointer-events-none",
        "max-sm:animate-jd-sheet-in max-sm:data-[state=closing]:animate-jd-sheet-out sm:animate-jd-slide-in-right sm:data-[state=closing]:animate-jd-slide-out-right",
      )}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onEscape(item.id);
      }}
    >
      <div className="flex h-11 w-full flex-row items-center gap-2.5 overflow-hidden rounded-xl bg-[color:var(--jd-ink)] pl-3.5 pr-2 text-[13px] font-semibold text-[color:var(--jd-page)] shadow-[0_10px_26px_rgba(17,17,17,0.22)]">
        {item.icon ? (
          // eslint-disable-next-line @next/next/no-img-element -- a product's 20 px icon: fixed size, no layout shift to optimize
          <img src={item.icon} alt="" width={20} height={20} className="size-5 shrink-0 rounded-[5px]" />
        ) : (
          <ToastGlyph variant={item.variant} />
        )}
        <span title={news} className="min-w-0 flex-1 truncate whitespace-nowrap">
          <span className="sr-only">{labels.variant[item.variant]}: </span>
          {item.app && (
            <>
              <b>{item.app}</b>
              <span aria-hidden> · </span>
              <span className="sr-only">. </span>
            </>
          )}
          {news}
        </span>
        {item.cancel && (
          <button type="button" className={LINK} onClick={press(item.cancel)}>
            {item.cancel.label}
          </button>
        )}
        {item.action && (
          <button type="button" className={LINK} onClick={press(item.action)}>
            {item.action.label}
          </button>
        )}
        <button
          type="button"
          aria-label={labels.dismiss}
          data-toast-dismiss=""
          onClick={() => onDismiss(item.id)}
          className="flex size-7 shrink-0 cursor-pointer flex-row items-center justify-center rounded-lg text-[color:var(--jd-page)] hover:bg-[color:var(--jd-page)]/16 pointer-coarse:size-11 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--jd-page)]"
        >
          <Glyph name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
