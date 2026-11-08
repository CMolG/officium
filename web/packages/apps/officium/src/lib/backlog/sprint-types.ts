// Sprint wire shapes, split from types.ts (JAVA-1386) to keep it under its architecture ceiling.

// ---- the project workspace (officium-api.md §8, JAVA-49) -----------------------------------

export type SprintState = "planned" | "active" | "closed";

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  state: SprintState;
  /** `yyyy-mm-dd`, planned dates. */
  startDate: string | null;
  endDate: string | null;
  /** When it really started / closed. */
  startedAt: string | null;
  closedAt: string | null;
  /** Dense `0..n-1` among PLANNED sprints. */
  order: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  openCardCount: number;
  /** Sum of its cards' hours. */
  estimate: number;
}
