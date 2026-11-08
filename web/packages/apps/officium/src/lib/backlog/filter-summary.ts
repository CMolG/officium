import { CATEGORY_CONFIG } from "./category-config";
import { PRIORITY_CONFIG } from "./status-config";
import type { Category, Executor, Priority } from "./types";

/** The board's filter state, as far as a sentence about it needs. */
export interface FilterState {
  searchTerm: string;
  activePriorities: readonly Priority[];
  epicFilter: string;
  tagFilter: string;
  assigneeFilter: string;
  executorFilter: Executor | null;
  categoryFilter: Category | null;
  blockedOnly: boolean;
}

/**
 * The names of the filters that are on, in the order the toolbar shows them (Off-Board, "Nothing matches"): what
 * a person reads under "No cards match these filters", so the empty board says which of its filters to take off.
 */
export function filterNames(state: FilterState): string[] {
  const names: string[] = [];
  if (state.searchTerm.trim()) names.push(`“${state.searchTerm.trim()}”`);
  if (state.categoryFilter) names.push(CATEGORY_CONFIG[state.categoryFilter].label);
  if (state.epicFilter) names.push(state.epicFilter);
  if (state.tagFilter) names.push(state.tagFilter);
  if (state.assigneeFilter) names.push(state.assigneeFilter);
  for (const priority of state.activePriorities) names.push(PRIORITY_CONFIG[priority].label);
  if (state.executorFilter) names.push(state.executorFilter === "human" ? "Person" : "AI agent");
  if (state.blockedOnly) names.push("Blocked");
  return names;
}

/** "2 filters are on: Bug, Blocked." */
export function filterSentence(names: readonly string[]): string {
  return `${names.length} ${names.length === 1 ? "filter is" : "filters are"} on: ${names.join(", ")}.`;
}
