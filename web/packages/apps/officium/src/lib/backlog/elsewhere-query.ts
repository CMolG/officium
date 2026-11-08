import { STATUS_ORDER } from "./status-config";
import type { CardQuery, Category, Executor, Priority } from "./types";

/** The board filters a search outside the board carries (the status chips stay on the board). */
export interface ElsewhereFilters {
  searchTerm: string;
  activePriorities: readonly Priority[];
  epicFilter: string;
  tagFilter: string;
  executorFilter: Executor | null;
  categoryFilter: Category | null;
  blockedOnly: boolean;
}

/** How many cards each place shows at most: the newest first. */
export const ELSEWHERE_LIMIT = 20;

/**
 * The two server reads the Task Board makes when its filters match nothing on it (JAVA-2046): the
 * backlog (no sprint, every open status) and the completed cards. The server narrows by what it
 * filters the same way; the board's own `matches` then runs on the answer, so the assignee and the
 * rest read exactly as they do on the board.
 */
export function elsewhereQueries(filters: ElsewhereFilters): { backlog: CardQuery; completed: CardQuery } {
  const q = filters.searchTerm.trim();
  const common: CardQuery = {
    ...(q ? { q } : {}),
    ...(filters.activePriorities.length > 0 ? { priority: [...filters.activePriorities] } : {}),
    ...(filters.epicFilter ? { epic: filters.epicFilter } : {}),
    ...(filters.tagFilter ? { tag: filters.tagFilter } : {}),
    ...(filters.executorFilter ? { executor: filters.executorFilter } : {}),
    ...(filters.categoryFilter ? { category: filters.categoryFilter } : {}),
    ...(filters.blockedOnly ? { blocked: true } : {}),
    sort: "updated",
    limit: ELSEWHERE_LIMIT,
  };
  return {
    backlog: { ...common, sprint: "backlog", status: [...STATUS_ORDER] },
    completed: { ...common, status: ["done"] },
  };
}
