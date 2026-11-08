"use client";

import { Button, Text } from "@javadaba/ui";

import { filterNames } from "../../../lib/backlog/filter-summary";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import { ElsewherePlace as Place } from "./ElsewherePlace";
import { EmptyFilterState } from "./EmptyFilterState";
import type { BoardFilters } from "./use-board-filters";
import { useElsewhereMatches } from "./use-elsewhere-matches";

export interface NoBoardMatchesProps {
  repository: BacklogRepository;
  projectId: string;
  filters: BoardFilters;
  openCard: (keyOrId: string) => Promise<void>;
}

/**
 * What the Task Board shows when its filters match nothing on it (JAVA-2046): the matches in the
 * backlog and among the completed cards, each opening the card; "No cards match these filters."
 * only when neither has any.
 */
export function NoBoardMatches({ repository, projectId, filters, openCard }: NoBoardMatchesProps) {
  const found = useElsewhereMatches({ repository, projectId, filters });

  if (found.state === "looking") {
    return (
      <div role="status" className="flex flex-col items-center gap-2 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] px-6 py-12 text-center">
        <Text size="sm" tone="muted">Not on this board. Looking in the backlog and the completed cards…</Text>
      </div>
    );
  }
  if (found.state === "idle" || (found.backlog.length === 0 && found.completed.length === 0)) {
    return <EmptyFilterState names={filterNames(filters)} onClear={filters.clearAll} />;
  }
  return (
    <section aria-label="Not on this board" className="flex flex-col gap-4 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] px-4 py-5 sm:px-6">
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="m-0 text-sm font-semibold text-[color:var(--jd-ink)]">Not on this board</p>
          <Text size="sm" tone="muted">These cards match your filters outside the sprint&apos;s board.</Text>
        </div>
        <Button type="button" register="ui" variant="outline" size="sm" onClick={filters.clearAll}>
          Clear filters
        </Button>
      </div>
      <Place title="In the backlog" cards={found.backlog} openCard={openCard} />
      <Place title="Completed" cards={found.completed} openCard={openCard} />
    </section>
  );
}
