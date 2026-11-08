"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useCallback, useState } from "react";

import { matchesSearch } from "../../../lib/backlog/card-search";
import type { BoardCard } from "../../../lib/backlog/board-copy";
import type { Category, Executor, Priority, Status } from "../../../lib/backlog/types";
import type { SortKey } from "../TopBar";

/** The search, sort and filter state, and the test a card has to pass to match it. */
export function useBoardFilters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [activeStatuses, setActiveStatuses] = useState<Status[]>([]);
  const [activePriorities, setActivePriorities] = useState<Priority[]>([]);
  const [epicFilter, setEpicFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [executorFilter, setExecutorFilter] = useState<Executor | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [blockedOnly, setBlockedOnly] = useState(false);

  const filtering = Boolean(
    searchTerm.trim() || activePriorities.length > 0 || epicFilter || tagFilter || assigneeFilter
    || executorFilter || categoryFilter || blockedOnly,
  );
  // Changes whenever a filter does: the matches rise (below), each column scrolls back to its top
  // where they went, and the cards glide there.
  const liftKey = filtering
    ? [searchTerm, activePriorities.join(), epicFilter, tagFilter, assigneeFilter, executorFilter, categoryFilter, blockedOnly].join("|")
    : "";

  const matches = useCallback(
    (card: BoardCard) => {
      return (
        matchesSearch(card, searchTerm) &&
        (activePriorities.length === 0 || activePriorities.includes(card.priority)) &&
        (!epicFilter || card.epic === epicFilter) &&
        (!tagFilter || card.tags.includes(tagFilter)) &&
        (!assigneeFilter || card.assignees.some((a) => a.name === assigneeFilter)) &&
        (!executorFilter || card.executor === executorFilter) &&
        (!categoryFilter || card.category === categoryFilter) &&
        (!blockedOnly || card.blocked)
      );
    },
    [searchTerm, activePriorities, epicFilter, tagFilter, assigneeFilter, executorFilter, categoryFilter, blockedOnly],
  );

  /** Takes every filter off, in one step. */
  const clearAll = useCallback(() => {
    setSearchTerm("");
    setActiveStatuses([]);
    setActivePriorities([]);
    setEpicFilter("");
    setTagFilter("");
    setAssigneeFilter("");
    setExecutorFilter(null);
    setCategoryFilter(null);
    setBlockedOnly(false);
  }, []);

  return {
    clearAll,
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
    filtering,
    liftKey,
    matches,
  };
}

export type BoardFilters = ReturnType<typeof useBoardFilters>;
