"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface StripItem {
  id: string;
  title: string;
  glyph: ReactNode;
}

/** The categories as a radio group: Left and Right move focus, Enter or Space chooses (roving tab stop). */
export function CategoryStrip({
  label,
  items,
  selected,
  onChoose,
}: {
  label: string;
  items: StripItem[];
  selected: string;
  onChoose: (id: string) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selected));

  // Brings the chosen category into view inside the strip (never the page), on mount and on every change.
  // Layout offsets, not client rects: a rect read while the dialog animates in is scaled, and the centring lands wrong.
  useEffect(() => {
    const container = strip.current;
    const button = buttons.current[selectedIndex];
    if (!container || !button) return;
    container.scrollLeft = button.offsetLeft - (container.clientWidth - button.offsetWidth) / 2;
  }, [selectedIndex]);

  function step(event: KeyboardEvent<HTMLDivElement>) {
    const current = buttons.current.findIndex((button) => button === event.target);
    if (current < 0) return;
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    const next = (current + direction + items.length) % items.length;
    buttons.current[next]?.focus();
    buttons.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div ref={strip} role="radiogroup" aria-label={label} onKeyDown={step} className="relative -mx-1 -my-1 flex shrink-0 flex-row gap-1 overflow-x-auto px-1 py-1">
      {items.map((item, index) => {
        const isSelected = item.id === selected;
        return (
          <button
            key={item.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={item.title}
            title={item.title}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChoose(item.id)}
            className={`flex size-11 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] ${
              isSelected ? "bg-[color:var(--jd-fg)]/[0.1] ring-2 ring-inset ring-[color:var(--jd-fg)]" : "hover:bg-[color:var(--jd-fg)]/[0.06]"
            } focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--jd-fg)] focus-visible:outline-none`}
          >
            <span aria-hidden="true" className="flex flex-row items-center justify-center">
              {item.glyph}
            </span>
          </button>
        );
      })}
    </div>
  );
}
