import {
  Ban,
  CheckCheck,
  Rocket,
  Eye,
  Code2,
  Box,
  PlayCircle,
  ListTodo,
  ChevronsUp,
  ChevronUp,
  Minus,
  ChevronDown,
  ChevronsDown,
  type LucideIcon,
} from "lucide-react";

import type { Priority, Status } from "./types";

export interface StatusConfig {
  id: Status;
  /** English label (`doc://history/plans/2026-08-16-english-everywhere`); the id stays the
   *  contract's Spanish-agnostic slug. */
  label: string;
  /** Board column order, left to right: the workflow's own direction, Refine first and Deploy
   *  last (user decision, 2026-09-15 -- "starting from the left it must be Refine"). A card
   *  travels left to right as it gets done, the way the contract's `Status` union already lists
   *  the states (`doc://contracts/officium-api` §2). An earlier pass had copied the
   *  concept's Deploy-first order; the user corrected it. */
  order: number;
  /** Polygon side count -- axis 2 of `art-direction.md`: "3 sides for the first, 8 for
   *  the last": Refine (leftmost) is a triangle, Deploy (rightmost) an octagon. The concept went
   *  2..7, with a degenerate 2-sided "bar"; shifted by one so every state is a real polygon. */
  sides: number;
  icon: LucideIcon;
  /** The concept's palette for this state, as custom properties (`globals.css` holds the values
   *  and the measured contrast). `fill` tints, `ink` writes on the tint, `line` rules and strokes. */
  tone: { fill: string; ink: string; line: string };
}

/** Custom-property references for a state's palette. Literal `var()` strings, not class names:
 *  they go into `style` and SVG attributes, so Tailwind never has to see them. */
function statusTone(id: Status): StatusConfig["tone"] {
  return {
    fill: `var(--officium-status-${id})`,
    ink: `var(--officium-status-${id}-ink)`,
    line: `var(--officium-status-${id}-line)`,
  };
}

/** The board's columns, left to right. Completed is not one of them (user decision, 2026-09-23).
 *  In progress comes before Ready (user decision, 2026-09-24), so Ready no longer means "ready to
 *  start": To do says that. */
export const STATUS_ORDER: Status[] = ["refine", "todo", "doing", "ready", "review", "deploy"];

/** Every state a card can be in: the columns, then the two with no column, Completed and Rejected
 *  (card://JAVA-1415). A status picker offers Rejected only as a rejected card's own value: a card
 *  is rejected through its Reject action, which asks for the reason. */
export const ALL_STATUSES: Status[] = [...STATUS_ORDER, "done", "rejected"];

/** Done or rejected: off the board, never worked again, never counted as open. A rejected card is
 *  not finished, though: it keeps blocking (`link-lists.ts`). */
export const isClosed = (status: Status) => status === "done" || status === "rejected";

export const STATUS_CONFIG: Record<Status, StatusConfig> = {
  refine: { id: "refine", label: "Refine", order: 0, sides: 3, icon: ListTodo, tone: statusTone("refine") },
  todo: { id: "todo", label: "To do", order: 1, sides: 4, icon: PlayCircle, tone: statusTone("todo") },
  doing: { id: "doing", label: "In progress", order: 2, sides: 5, icon: Code2, tone: statusTone("doing") },
  ready: { id: "ready", label: "Ready", order: 3, sides: 6, icon: Box, tone: statusTone("ready") },
  review: { id: "review", label: "Review", order: 4, sides: 7, icon: Eye, tone: statusTone("review") },
  deploy: { id: "deploy", label: "Deploy", order: 5, sides: 8, icon: Rocket, tone: statusTone("deploy") },
  // Past the last column, one more side: the sequence goes on even where the board stops.
  done: { id: "done", label: "Completed", order: 6, sides: 9, icon: CheckCheck, tone: statusTone("done") },
  // Discarded, not finished: its own shape and icon, so it never reads as Completed in grey.
  rejected: { id: "rejected", label: "Rejected", order: 7, sides: 10, icon: Ban, tone: statusTone("rejected") },
};

export interface PriorityConfig {
  id: Priority;
  label: string;
  icon: LucideIcon;
  /** Lower sorts first. */
  weight: number;
  /** The concept's priority colour (red, orange, yellow, blue, cyan), for the icon. */
  color: string;
}

export const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  superHigh: { id: "superHigh", label: "Critical", icon: ChevronsUp, weight: 1, color: "var(--officium-priority-superHigh)" },
  high: { id: "high", label: "High", icon: ChevronUp, weight: 2, color: "var(--officium-priority-high)" },
  medium: { id: "medium", label: "Medium", icon: Minus, weight: 3, color: "var(--officium-priority-medium)" },
  low: { id: "low", label: "Low", icon: ChevronDown, weight: 4, color: "var(--officium-priority-low)" },
  superLow: { id: "superLow", label: "Very low", icon: ChevronsDown, weight: 5, color: "var(--officium-priority-superLow)" },
};
