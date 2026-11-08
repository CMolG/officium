"use client";

import * as React from "react";

import { FOCUS_RING } from "../lib/focus-ring";
import { type CivilDate, civilKey, compareCivil, isSameMonth, weekday, weekdayOrder } from "./calendar-dates";
import type { CalendarItem } from "./calendar-events";
import { nextFocusedDay } from "./calendar-keys";
import type { CalendarView } from "./calendar-view";
import { startOfDayInstant } from "./calendar-zone";

/*
 * The month as an ARIA grid (JAVA-1623, D8). One tab stop: the selected day. Arrows, Home, End,
 * PageUp and PageDown move the selection through `nextFocusedDay`. Each cell's name says its day,
 * its count and whether it is today, so color is never the only channel.
 */

export type CalendarMonthProps = CalendarView & {
  cells: readonly CivilDate[];
  selected: CivilDate;
  today: CivilDate;
  byDay: ReadonlyMap<string, readonly CalendarItem[]>;
  onSelect: (day: CivilDate) => void;
};

const MAX_MARKERS = 3;

export function CalendarMonth({
  cells,
  selected,
  today,
  byDay,
  zone,
  firstDay,
  formats,
  labels,
  onSelect,
}: CalendarMonthProps) {
  const selectedKey = civilKey(selected);
  const cellRefs = React.useRef(new Map<string, HTMLDivElement>());
  const followFocus = React.useRef(false);

  React.useEffect(() => {
    if (!followFocus.current) return;
    cellRefs.current.get(selectedKey)?.focus();
    followFocus.current = false;
  }, [selectedKey]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const next = nextFocusedDay(selected, event.key, firstDay, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    followFocus.current = true;
    onSelect(next);
  };

  const headerRow = cells.slice(0, 7);
  const rows = Array.from({ length: 6 }, (_, row) => cells.slice(row * 7, row * 7 + 7));

  return (
    <div role="grid" aria-label={labels.grid} onKeyDown={onKeyDown} className="flex flex-col gap-1">
      <div role="row" className="flex flex-row">
        {weekdayOrder(firstDay).map((index) => {
          const day = headerRow.find((cell) => weekday(cell) === index) ?? headerRow[0];
          return (
            <div key={index} role="columnheader" aria-label={formats.weekday(startOfDayInstant(day, zone))} className="flex flex-1 basis-0 flex-row justify-start px-2 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--jd-faint)]">
                {formats.shortWeekday(index)}
              </span>
            </div>
          );
        })}
      </div>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} role="row" className="flex flex-row gap-1">
          {row.map((cell) => {
            const key = civilKey(cell);
            const events = byDay.get(key) ?? [];
            const isSelected = key === selectedKey;
            const isToday = compareCivil(cell, today) === 0;
            const outside = !isSameMonth(cell, selected);
            const instant = startOfDayInstant(cell, zone);
            const name = `${formats.dayHeading(instant)}, ${labels.eventsCount(events.length)}${isToday ? `, ${labels.todayMark}` : ""}`;
            return (
              <div
                key={key}
                role="gridcell"
                tabIndex={isSelected ? 0 : -1}
                aria-selected={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={name}
                ref={(node) => {
                  if (node) cellRefs.current.set(key, node);
                  else cellRefs.current.delete(key);
                }}
                onClick={() => onSelect(cell)}
                data-outside={outside || undefined}
                className={[
                  "flex h-[84px] flex-1 basis-0 cursor-pointer flex-col items-start justify-between rounded-[var(--radius-jd-md)] p-2 max-sm:h-16 max-sm:p-1",
                  "transition-colors duration-[var(--jd-dur-fast)]",
                  FOCUS_RING,
                  outside ? "text-[color:var(--jd-faint)]" : "text-[color:var(--jd-ink)]",
                  isSelected
                    ? "bg-[color:var(--jd-raised)] shadow-[0_0_0_1.5px_var(--jd-ink)]"
                    : "hover:bg-[color:var(--jd-hover)]",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "flex flex-row size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    isToday ? "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]" : "",
                  ].join(" ")}
                >
                  {cell.day}
                </span>
                <div aria-hidden="true" className="flex h-1.5 flex-row items-center gap-1">
                  {events.slice(0, MAX_MARKERS).map((event) => (
                    <i
                      key={event.id}
                      className="block h-1.5 w-4 rounded-[3px] max-sm:w-2.5"
                      style={{ background: event.color ?? "var(--jd-ink)" }}
                    />
                  ))}
                  {events.length > MAX_MARKERS ? (
                    <span className="text-[10px] font-semibold tabular-nums text-[color:var(--jd-muted)]">{events.length}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
