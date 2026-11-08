"use client";

import { useState } from "react";
import { Link } from "@javadaba/ui/navigation";
import { Columns3, FileDown, Rows3, Search, SlidersHorizontal, SquareStack, TextSearch } from "lucide-react";

import { Button, Input, ToggleGroup, ToggleGroupItem } from "@javadaba/ui";

import type { Assignee, Category, Executor, Priority, Status } from "../../lib/backlog/types";
import { BoardFilterRow } from "./BoardFilterRow";
import { ClosedCardLinks } from "./ClosedCardLinks";

export type SortKey = "status" | "priority" | "createdDesc" | "createdAsc" | "updatedDesc" | "estimateDesc" | "loggedDesc";
export type ViewMode = "board" | "list" | "stack";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "status", label: "Status sequence" },
  { key: "priority", label: "Priority" },
  { key: "createdDesc", label: "Created (newest)" },
  { key: "createdAsc", label: "Created (oldest)" },
  { key: "updatedDesc", label: "Updated (newest)" },
  { key: "estimateDesc", label: "Estimate (largest)" },
  { key: "loggedDesc", label: "Logged hours (most)" },
];

export interface TopBarProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  sortKey: SortKey;
  onSort: (value: SortKey) => void;
  activeStatuses: Status[];
  onToggleStatuses: (values: Status[]) => void;
  activePriorities: Priority[];
  onTogglePriorities: (values: Priority[]) => void;
  epics: string[];
  epicFilter: string;
  onEpicFilter: (value: string) => void;
  tags: string[];
  tagFilter: string;
  onTagFilter: (value: string) => void;
  assignees: Assignee[];
  assigneeFilter: string;
  onAssigneeFilter: (value: string) => void;
  /** `null` = all executors. JDB-239 directive. */
  executorFilter: Executor | null;
  onExecutorFilter: (value: Executor | null) => void;
  /** `null` = every category, and the cards with none. */
  categoryFilter: Category | null;
  onCategoryFilter: (value: Category | null) => void;
  blockedOnly: boolean;
  onToggleBlockedOnly: () => void;
  onOpenReport: () => void;
  onOpenNewCard: () => void;
  /** False for a viewer of the project: New card is not offered (Off-Shell, "Viewers are told"). */
  canCreate?: boolean;
  /** The search view. Absent where the board cannot navigate (inside a Theater). */
  searchHref?: string;
  /** The search view opened on the finished cards ("View completed"), and on the rejected ones. */
  completedHref?: string;
  rejectedHref?: string;
  onReset: () => void;
  visibleCount: number;
  loggedTotal: number;
  /** Null until the client knows which view the project opens in: nothing is pressed yet. */
  viewMode: ViewMode | null;
  onViewMode: (mode: ViewMode) => void;
  /** Below `lg`, fold the filters behind a button. Off inside the product page's Theater. */
  collapsibleFilters?: boolean;
}

// The outline variant paints no fill of its own; on a phone in dark mode that let a label vanish
// into whatever was behind it (JAVA-124), so every control here states its background.
const CONTROL_BG = "bg-[color:var(--jd-raised)]";
const ROW = "flex flex-row flex-wrap items-center gap-2";

export function TopBar(props: TopBarProps) {
  const {
    searchTerm, onSearch, sortKey, onSort, activeStatuses, onToggleStatuses,
    activePriorities, onTogglePriorities, epics, epicFilter, onEpicFilter,
    tags, tagFilter, onTagFilter, assignees, assigneeFilter, onAssigneeFilter,
    executorFilter, onExecutorFilter, categoryFilter, onCategoryFilter, blockedOnly, onToggleBlockedOnly,
    onOpenReport, onOpenNewCard, searchHref, completedHref, rejectedHref, onReset, visibleCount, loggedTotal,
    viewMode, onViewMode, collapsibleFilters = true, canCreate = true,
  } = props;

  // In board mode the columns ARE the statuses (JAVA-584): the status filter is neither shown nor
  // counted there, since the board ignores it; stack and list keep it.
  const statusFilterOn = viewMode !== "board" && activeStatuses.length > 0;
  const hasActiveFilters =
    searchTerm || statusFilterOn || activePriorities.length > 0 || epicFilter || tagFilter
    || assigneeFilter || executorFilter || categoryFilter || blockedOnly;
  // Filters that live in the folded panel (the search box stays out): the phone's toggle says how
  // many are on, so a board narrowed by a hidden filter never looks like it is missing cards.
  const foldedFilters = [
    statusFilterOn, activePriorities.length > 0, epicFilter, tagFilter, assigneeFilter,
    executorFilter, categoryFilter, blockedOnly,
  ].filter(Boolean).length;

  // Below `lg` the filters fold behind one button (user report, 2026-09-24: Officium could not be
  // used on a phone): unfolded, they took the whole screen and left the board no height. The
  // Theater's scene opens them: its script clicks filters, and a phone-sized frame must still show
  // them.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const showFilters = filtersOpen || !collapsibleFilters;
  // Unfolded on a phone, the filters rise into place instead of appearing in one frame (JAVA-59).
  const unfold = filtersOpen ? "officium-rise" : "";

  // Five groups, one job each, in this order (JAVA-122). They used to be `lg:contents` wrappers
  // that poured the search, the four pickers and every action into a single desktop line, which
  // collapsed onto itself at ordinary widths. Each group wraps on its own now.
  return (
    <header className="z-20 flex shrink-0 flex-col gap-3 border-b border-[color:var(--jd-line)] bg-[color:var(--jd-page)] px-4 py-3 sm:px-6 lg:sticky lg:top-0">
      {/* 1. Search and the board's own actions. New card lives here, so folding the filters never hides it. */}
      <div className={ROW}>
        {/* Grows from a 12rem basis: narrower than that, the row wraps instead of crushing it. */}
        <div className="relative min-w-0 grow basis-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--jd-faint)]" size={16} aria-hidden="true" />
          <Input
            type="search"
            aria-label="Search the backlog"
            placeholder="Search the backlog…"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        {collapsibleFilters && (
          <Button
            type="button"
            register="ui"
            variant="outline"
            size="sm"
            className={`${CONTROL_BG} min-h-11 shrink-0 lg:hidden`}
            aria-expanded={filtersOpen}
            aria-controls="board-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filters{foldedFilters > 0 ? ` (${foldedFilters})` : ""}
          </Button>
        )}

        {/* The board's actions travel together: too narrow for them beside the search, they wrap
            below it as one line, instead of leaving New card alone on a line of its own. */}
        <div className="flex flex-row flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode ?? ""}
            // No view until the page hydrates (`useViewMode`): a tap before then would be lost, and
            // the board would open in the remembered view instead (JAVA-1529).
            disabled={viewMode === null}
            onValueChange={(v) => v && onViewMode(v as ViewMode)}
            className="shrink-0 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] p-1"
            aria-label="Backlog layout"
          >
            {/* `data-theater-target`: where the product page's Theater cursor clicks. */}
            <ToggleGroupItem value="board" aria-label="Board view" data-theater-target="view-board">
              <Columns3 size={16} />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" data-theater-target="view-list">
              <Rows3 size={16} />
            </ToggleGroupItem>
            <ToggleGroupItem value="stack" aria-label="Stack view" data-theater-target="view-stack">
              <SquareStack size={16} />
            </ToggleGroupItem>
          </ToggleGroup>

          <ClosedCardLinks completedHref={completedHref} rejectedHref={rejectedHref} className={CONTROL_BG} />

          {searchHref && (
            <Button asChild register="ui" variant="outline" size="sm" className={CONTROL_BG}>
              <Link href={searchHref}>
                <TextSearch size={16} aria-hidden="true" />
                Search
              </Link>
            </Button>
          )}

          <Button type="button" register="ui" variant="outline" size="sm" className={CONTROL_BG} onClick={onOpenReport}>
            <FileDown size={16} />
            Time report
          </Button>

          {canCreate && (
            <Button type="button" register="ui" size="sm" onClick={onOpenNewCard}>
              New card
            </Button>
          )}
        </div>
      </div>

      <div id="board-filters" className={`${showFilters ? "flex" : "hidden"} ${unfold} flex-col gap-3 lg:flex`}>
        <BoardFilterRow
          viewMode={viewMode}
          sortKey={sortKey}
          onSort={onSort}
          activeStatuses={activeStatuses}
          onToggleStatuses={onToggleStatuses}
          activePriorities={activePriorities}
          onTogglePriorities={onTogglePriorities}
          epics={epics}
          epicFilter={epicFilter}
          onEpicFilter={onEpicFilter}
          tags={tags}
          tagFilter={tagFilter}
          onTagFilter={onTagFilter}
          assignees={assignees}
          assigneeFilter={assigneeFilter}
          onAssigneeFilter={onAssigneeFilter}
          executorFilter={executorFilter}
          onExecutorFilter={onExecutorFilter}
          categoryFilter={categoryFilter}
          onCategoryFilter={onCategoryFilter}
          blockedOnly={blockedOnly}
          onBlockedOnly={() => onToggleBlockedOnly()}
          hasActiveFilters={Boolean(hasActiveFilters)}
          onReset={onReset}
          visibleCount={visibleCount}
          loggedTotal={loggedTotal}
        />
      </div>
    </header>
  );
}
