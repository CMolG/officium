"use client";

import { Button, Checkbox, Glyph, Popover, PopoverContent, PopoverTrigger } from "@javadaba/ui";

import { PRIORITY_CONFIG } from "../../lib/backlog/status-config";
import type { Priority } from "../../lib/backlog/types";

const PICKER = "min-w-0 grow basis-[40%] justify-between lg:grow-0 lg:basis-auto";

/** What the trigger says: the word alone, one priority by name, or how many. */
function summary(value: readonly Priority[]): string {
  if (value.length === 0) return "All priorities";
  if (value.length === 1) return PRIORITY_CONFIG[value[0]!].label;
  return `${value.length} priorities`;
}

/**
 * The priority filter as a dropdown of the filter row (Off-Board, "One toolbar"): several priorities can be on at once, so it
 * is a list of checkboxes in a popover rather than a single choice. Each row draws its priority's shape beside its name.
 */
export function PriorityFilter({ value, onChange }: { value: Priority[]; onChange: (next: Priority[]) => void }) {
  const toggle = (id: Priority) => onChange(value.includes(id) ? value.filter((p) => p !== id) : [...value, id]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" register="ui" variant="outline" size="sm" aria-label="Filter by priority" data-theater-target="filter-priority" className={PICKER}>
          <span className="truncate">{summary(value)}</span>
          <Glyph name="chevron-down" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-56 flex-col gap-1 p-2">
        <div role="group" aria-label="Priorities" className="flex flex-col">
          {Object.values(PRIORITY_CONFIG).map((p) => (
            <div key={p.id} className="flex min-h-11 flex-row items-center gap-2 rounded-[var(--radius-jd-control)] px-2 hover:bg-[color:var(--jd-hover)]">
              <Checkbox checked={value.includes(p.id)} onChange={() => toggle(p.id)} data-theater-target={`filter-priority-${p.id}`}>
                <span className="flex flex-row items-center gap-2 text-sm">
                  <p.icon size={14} strokeWidth={2.5} style={{ color: p.color }} aria-hidden="true" />
                  {p.label}
                </span>
              </Checkbox>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
