"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { COMPLETED_JQL, REJECTED_JQL, searchPath } from "../../../lib/backlog/search-links";
import { chooseViewMode } from "../../../lib/backlog/view-mode";
import type { Assignee } from "../../../lib/backlog/types";
import { TopBar, type ViewMode } from "../TopBar";
import type { BoardFilters } from "./use-board-filters";

export interface BoardToolbarProps {
  inTheater: boolean;
  projectId: string;
  filters: BoardFilters;
  epics: string[];
  tags: string[];
  assignees: Assignee[];
  snapshotCards: () => void;
  visibleCount: number;
  loggedTotal: number;
  viewMode: ViewMode | null;
  setViewSwitched: (switched: boolean) => void;
  setTheaterView: (mode: ViewMode) => void;
  setReportOpen: (open: boolean) => void;
  setNewCardOpen: (open: boolean) => void;
  /** False for a viewer of the project. */
  canCreate: boolean;
}

/** The search, sort and filter bar, with every filter change recording where the cards are first. */
export function BoardToolbar({
  inTheater,
  projectId,
  filters,
  epics,
  tags,
  assignees,
  snapshotCards,
  visibleCount,
  loggedTotal,
  viewMode,
  setViewSwitched,
  setTheaterView,
  setReportOpen,
  setNewCardOpen,
  canCreate,
}: BoardToolbarProps) {
  const {
    searchTerm,
    setSearchTerm,
    sortKey,
    setSortKey,
    activeStatuses,
    setActiveStatuses,
    activePriorities,
    setActivePriorities,
    epicFilter,
    setEpicFilter,
    tagFilter,
    setTagFilter,
    assigneeFilter,
    setAssigneeFilter,
    executorFilter,
    setExecutorFilter,
    categoryFilter,
    setCategoryFilter,
    blockedOnly,
    setBlockedOnly,
  } = filters;

  /** A filter setter that first records where every card is, so the lift glides (`use-card-flip.ts`). */
  const lifting = <A extends unknown[]>(set: (...args: A) => void) => (...args: A) => {
    snapshotCards();
    set(...args);
  };

  return (
    <TopBar
      searchTerm={searchTerm}
      onSearch={lifting(setSearchTerm)}
      sortKey={sortKey}
      onSort={setSortKey}
      activeStatuses={activeStatuses}
      onToggleStatuses={setActiveStatuses}
      activePriorities={activePriorities}
      onTogglePriorities={lifting(setActivePriorities)}
      epics={epics}
      epicFilter={epicFilter}
      onEpicFilter={lifting(setEpicFilter)}
      tags={tags}
      tagFilter={tagFilter}
      onTagFilter={lifting(setTagFilter)}
      assignees={assignees}
      assigneeFilter={assigneeFilter}
      onAssigneeFilter={lifting(setAssigneeFilter)}
      executorFilter={executorFilter}
      onExecutorFilter={lifting(setExecutorFilter)}
      categoryFilter={categoryFilter}
      onCategoryFilter={lifting(setCategoryFilter)}
      blockedOnly={blockedOnly}
      onToggleBlockedOnly={lifting(() => setBlockedOnly((v) => !v))}
      onOpenReport={() => setReportOpen(true)}
      onOpenNewCard={() => setNewCardOpen(true)}
      canCreate={canCreate}
      // Links to another page: the Theater's copy of this board has nowhere to go (contract §3).
      searchHref={inTheater ? undefined : searchPath(projectId)}
      completedHref={inTheater ? undefined : searchPath(projectId, COMPLETED_JQL)}
      rejectedHref={inTheater ? undefined : searchPath(projectId, REJECTED_JQL)}
      onReset={() => {
        snapshotCards();
        setSearchTerm("");
        setActiveStatuses([]);
        setActivePriorities([]);
        setEpicFilter("");
        setTagFilter("");
        setAssigneeFilter("");
        setExecutorFilter(null);
        setCategoryFilter(null);
        setBlockedOnly(false);
      }}
      visibleCount={visibleCount}
      loggedTotal={Number(loggedTotal.toFixed(2))}
      viewMode={viewMode}
      collapsibleFilters={!inTheater}
      onViewMode={(mode) => {
        setViewSwitched(true);
        if (inTheater) setTheaterView(mode);
        else chooseViewMode(projectId, mode);
      }}
    />
  );
}
