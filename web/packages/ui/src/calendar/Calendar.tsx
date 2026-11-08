"use client";

import * as React from "react";

import { Button } from "../ui/button";
import { Glyph } from "../ui/glyph";
import { IconButton } from "../ui/icon-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Text } from "../ui/text";
import { addDays, addMonths, civilKey, type CivilDate, monthGrid, parseCivilKey } from "./calendar-dates";
import { type CalendarItem, eventsByDay, nextUp } from "./calendar-events";
import { type CalendarLabels, resolveCalendarLabels } from "./calendar-labels";
import { calendarFormats } from "./calendar-locale";
import { CalendarAgenda } from "./CalendarAgenda";
import { CalendarDayList } from "./CalendarDayList";
import { CalendarLegend } from "./CalendarLegend";
import { CalendarMonth } from "./CalendarMonth";
import { dayKey, startOfDayInstant } from "./calendar-zone";

export type CalendarTab = "month" | "agenda";

/*
 * The calendar shell (JAVA-1623, D3): the month heading, previous / today / next, the next-up line,
 * the month grid and the selected day's list. It knows items, a zone, a locale and callbacks; it
 * fetches nothing. The selected day is the only state the caller owns: its month is what shows.
 */

export type CalendarProps = {
  selected: CivilDate;
  items: readonly CalendarItem[];
  now: Date;
  zone: string;
  locale: string;
  firstDay: number;
  labels?: Partial<CalendarLabels>;
  status?: React.ReactNode;
  /** A drawing for the empty agenda (a doodle). */
  emptyArt?: React.ReactNode;
  /** The tab it opens on: a phone's host asks for the agenda (Trb-Calendar, Phone). Month when absent. */
  initialTab?: CalendarTab;
  onSelect: (day: CivilDate) => void;
  onOpen: (item: CalendarItem) => void;
  onNew: (day: CivilDate) => void;
};

export function Calendar({
  selected,
  items,
  now,
  zone,
  locale,
  firstDay,
  labels: overrides,
  status,
  emptyArt,
  initialTab = "month",
  onSelect,
  onOpen,
  onNew,
}: CalendarProps) {
  const [tab, setTab] = React.useState<CalendarTab>(initialTab);
  const labels = React.useMemo(() => resolveCalendarLabels(overrides), [overrides]);
  const formats = React.useMemo(() => calendarFormats(locale, zone), [locale, zone]);
  const today = React.useMemo(() => parseCivilKey(dayKey(now, zone)), [now, zone]);
  const cells = React.useMemo(() => monthGrid(selected.year, selected.month, firstDay), [selected, firstDay]);
  const byDay = React.useMemo(() => eventsByDay(items, cells, zone), [items, cells, zone]);
  const next = React.useMemo(() => nextUp(items, now, zone), [items, now, zone]);

  const monthYear = formats.monthYear(startOfDayInstant(selected, zone));
  const selectedHeading = formats.dayHeading(startOfDayInstant(selected, zone));
  const selectedItems = byDay.get(civilKey(selected)) ?? [];
  const view = { zone, firstDay, formats, labels };

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as CalendarTab)} className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <Text type="display-xs" as="h2" className="mr-2">
            {monthYear}
          </Text>
          <IconButton large aria-label={labels.previousMonth} onClick={() => onSelect(addMonths(selected, -1))}>
            <Glyph name="chevron-down" size={18} className="rotate-90" />
          </IconButton>
          <Button variant="outline" register="ui" size="sm" className="min-h-11 min-w-11" onClick={() => onSelect(today)}>
            {labels.today}
          </Button>
          <IconButton large aria-label={labels.nextMonth} onClick={() => onSelect(addMonths(selected, 1))}>
            <Glyph name="chevron-down" size={18} className="-rotate-90" />
          </IconButton>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-3">
          {next ? (
            <Text as="p" type="caption" tone="muted">
              {labels.nextUp(formats.time(next.startsAt), next.title)}
            </Text>
          ) : null}
          <TabsList className="h-11 p-1">
            <TabsTrigger value="month" className="h-full min-h-9">{labels.month}</TabsTrigger>
            <TabsTrigger value="agenda" className="h-full min-h-9">{labels.agenda}</TabsTrigger>
          </TabsList>
          <Button
            variant="solid"
            register="ui"
            size="md"
            className="min-h-11"
            aria-label={labels.newEventOn(selectedHeading)}
            onClick={() => onNew(selected)}
          >
            <Glyph name="plus" size={16} />
            {labels.newEvent}
          </Button>
        </div>
      </div>
      {status}
      <p role="status" aria-live="polite" className="sr-only">
        {labels.monthChanged(monthYear)}
      </p>
      <div className="flex flex-col gap-2">
        <TabsContent value="month" className="flex flex-col">
          <CalendarMonth
            {...view}
            cells={cells}
            selected={selected}
            today={today}
            byDay={byDay}
            onSelect={onSelect}
          />
          <CalendarLegend items={items} labels={labels} />
          <CalendarDayList
            {...view}
            day={selected}
            isToday={civilKey(selected) === civilKey(today)}
            items={selectedItems}
            onOpen={onOpen}
          />
          <section aria-label={labels.agenda} className="flex flex-col pt-4">
            <CalendarAgenda {...view} from={addDays(selected, 1)} today={today} items={items} onOpen={onOpen} hideEmpty />
          </section>
        </TabsContent>
        <TabsContent value="agenda">
          <CalendarAgenda {...view} from={today} today={today} items={items} emptyArt={emptyArt} onOpen={onOpen} onNew={onNew} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
