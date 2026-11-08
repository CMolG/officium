"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

import { gridNext } from "../../lib/icons/grid-keys";
import type { GridOption } from "./picker-types";

/**
 * The options as one listbox with a single tab stop (the selected option, else the first). Arrows move
 * through the wrapped grid by position; Enter and Space pick, through the button's own click. The caller
 * sizes it: the main grid gives height, Recent takes its content. The selected option is brought into view
 * inside the listbox, never by scrolling an ancestor.
 */
export function OptionGrid({
  labelledBy,
  options,
  selected,
  onPick,
  className,
  testId,
}: {
  labelledBy: string;
  options: GridOption[];
  selected: string;
  onPick: (id: string) => void;
  className: string;
  testId?: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.id === selected);
  const stop = selectedIndex >= 0 ? selectedIndex : 0;

  // Layout offsets, not client rects (a rect read mid-animation is scaled): the listbox is `relative`, so
  // offsetTop is measured from its own top edge.
  useEffect(() => {
    const container = list.current;
    const cell = cells.current[selectedIndex];
    if (!container || !cell) return;
    container.scrollTop = cell.offsetTop - (container.clientHeight - cell.offsetHeight) / 2;
  }, [selectedIndex]);

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const current = cells.current.findIndex((cell) => cell === event.target);
    if (current < 0) return;
    const rects = cells.current.map((cell) => ({ top: cell?.offsetTop ?? 0, left: cell?.offsetLeft ?? 0 }));
    const next = gridNext(event.key, current, rects);
    if (next === null) return;
    event.preventDefault();
    const target = cells.current[next];
    target?.focus();
    target?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div
      ref={list}
      role="listbox"
      aria-labelledby={labelledBy}
      data-testid={testId}
      onKeyDown={move}
      className={`relative flex flex-row flex-wrap content-start gap-1 ${className}`}
    >
      {options.map((option, index) => {
        const isSelected = option.id === selected;
        return (
          <button
            key={option.id}
            ref={(element) => {
              cells.current[index] = element;
            }}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-label={option.label}
            title={option.label}
            tabIndex={index === stop ? 0 : -1}
            onClick={() => onPick(option.id)}
            className={`flex size-11 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] ${
              isSelected ? "bg-[color:var(--jd-fg)]/[0.1] ring-2 ring-inset ring-[color:var(--jd-fg)]" : "hover:bg-[color:var(--jd-fg)]/[0.06]"
            } focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--jd-fg)] focus-visible:outline-none`}
          >
            <span aria-hidden="true" className="flex flex-row items-center justify-center">
              {option.glyph}
            </span>
          </button>
        );
      })}
    </div>
  );
}
