"use client";

import { Button, Text } from "@javadaba/ui";

import { filterSentence } from "../../../lib/backlog/filter-summary";

/**
 * "Nothing matches", in every layout (Off-Board: "Today only the list view says so"): which filters are on, and the
 * one button that takes them all off.
 */
export function EmptyFilterState({ names, onClear }: { names: readonly string[]; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] px-6 py-12 text-center">
      <p className="m-0 text-sm font-semibold text-[color:var(--jd-ink)]">No cards match these filters.</p>
      {names.length > 0 && (
        <Text size="sm" tone="muted">
          {filterSentence(names)}
        </Text>
      )}
      <Button type="button" register="ui" variant="outline" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
