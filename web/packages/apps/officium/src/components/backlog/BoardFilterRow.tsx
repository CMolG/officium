"use client";

import { X } from "lucide-react";

import { Button, Select, ToggleGroup, ToggleGroupItem } from "@javadaba/ui";

import { categoryOptions } from "../../lib/backlog/category-config";
import { STATUS_CONFIG, STATUS_ORDER } from "../../lib/backlog/status-config";
import type { Assignee, Category, Executor, Priority, Status } from "../../lib/backlog/types";
import { PriorityFilter } from "./PriorityFilter";
import { StatusShape } from "./StatusShape";
import { SORT_OPTIONS, type SortKey, type ViewMode } from "./TopBar";

// Two pickers per line on a phone, their natural width from `lg` up.
const PICKER = "min-w-0 grow basis-[40%] lg:grow-0 lg:basis-auto";
const ANY = "";

export interface BoardFilterRowProps {
  viewMode: ViewMode | null;
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
  executorFilter: Executor | null;
  onExecutorFilter: (value: Executor | null) => void;
  categoryFilter: Category | null;
  onCategoryFilter: (value: Category | null) => void;
  blockedOnly: boolean;
  onBlockedOnly: (value: boolean) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
  visibleCount: number;
  loggedTotal: number;
}

/**
 * The board's filters as one row of dropdowns (Off-Board, "One toolbar"): category, epic, tag, assignee, priority, who does
 * it and blocked, then how many cards that leaves and the way back to all of them. Status keeps its toggles outside board
 * view only, because in the board the columns are the statuses (JAVA-584).
 */
export function BoardFilterRow(props: BoardFilterRowProps) {
  const { viewMode, sortKey, onSort, activeStatuses, onToggleStatuses, executorFilter, blockedOnly, hasActiveFilters, onReset, visibleCount, loggedTotal } = props;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row flex-wrap items-center gap-2">
        {viewMode === "list" && (
          <Select
            aria-label="Sort by"
            className={PICKER}
            value={sortKey}
            onChange={(v) => onSort(v as SortKey)}
            options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
          />
        )}
        <Select
          aria-label="Filter by category"
          className={PICKER}
          value={props.categoryFilter}
          onChange={(v) => props.onCategoryFilter(v ? (v as Category) : null)}
          placeholder="All categories"
          options={[{ value: ANY, label: "All categories" }, ...categoryOptions()]}
          menuWidth={220}
        />
        <Select
          aria-label="Filter by epic"
          className={PICKER}
          value={props.epicFilter || null}
          onChange={props.onEpicFilter}
          placeholder="All epics"
          options={props.epics.map((e) => ({ value: e, label: e }))}
        />
        <Select
          aria-label="Filter by tag"
          className={PICKER}
          value={props.tagFilter || null}
          onChange={props.onTagFilter}
          placeholder="All tags"
          options={props.tags.map((t) => ({ value: t, label: t }))}
        />
        <Select
          aria-label="Filter by assignee"
          className={PICKER}
          value={props.assigneeFilter || null}
          onChange={props.onAssigneeFilter}
          placeholder="All assignees"
          options={props.assignees.map((a) => ({ value: a.name, label: a.name }))}
        />
        <PriorityFilter value={props.activePriorities} onChange={props.onTogglePriorities} />
        <Select
          aria-label="Filter by who does it"
          className={PICKER}
          value={executorFilter}
          onChange={(v) => props.onExecutorFilter(v ? (v as Executor) : null)}
          placeholder="Who does it"
          options={[
            { value: ANY, label: "Anyone" },
            { value: "ai", label: "AI agent" },
            { value: "human", label: "Person" },
          ]}
          data-theater-target="filter-executor"
        />
        <Select
          aria-label="Filter by blocked"
          className={PICKER}
          value={blockedOnly ? "blocked" : null}
          onChange={(v) => props.onBlockedOnly(v === "blocked")}
          placeholder="Blocked"
          options={[
            { value: ANY, label: "Blocked or not" },
            { value: "blocked", label: "Blocked only" },
          ]}
        />
        <span className="ml-auto shrink-0 text-xs font-medium text-[color:var(--jd-muted)]">
          {visibleCount} {visibleCount === 1 ? "card" : "cards"} · {loggedTotal.toFixed(2)}h logged
        </span>
        {hasActiveFilters && (
          <Button type="button" register="ui" variant="ghost" size="sm" onClick={onReset} data-theater-target="filter-clear">
            <X size={14} aria-hidden="true" /> Clear
          </Button>
        )}
      </div>

      {viewMode !== "board" && (
        <div className="flex flex-row flex-wrap items-center gap-2">
          <span className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-widest text-[color:var(--jd-muted)]">Status</span>
          <ToggleGroup
            type="multiple"
            value={activeStatuses}
            onValueChange={(values) => onToggleStatuses(values as Status[])}
            className="flex-wrap justify-start gap-1.5"
            aria-label="Filter by status"
          >
            {STATUS_ORDER.map((id) => (
              <ToggleGroupItem key={id} value={id} variant="outline" size="sm" aria-label={STATUS_CONFIG[id].label}>
                <StatusShape status={id} className="size-3.5" />
                {STATUS_CONFIG[id].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
