import type { Card, Status } from "./types";
import { epicChildren } from "./epic-badge";

/**
 * An epic's checkpoints (card://JAVA-1876): its cards in the order one session works them, as the API serves them
 * on `cards.get` (`EpicCheckpoints.java`). This is the in-memory backend's half, so the e2e board shows what the
 * server would. A card blocked by a sibling comes after it; the others keep the board's order (planned in a sprint
 * first, then rank, then number); the epic's test card runs last. Rejected cards and nested epics are no checkpoints.
 */
export type CheckpointState = "pending" | "in_progress" | "completed";

export interface Checkpoint {
  id: string;
  key: string;
  title: string;
  status: Status;
  state: CheckpointState;
  category: Card["category"];
  executor: Card["executor"];
  /** Out of Refine: its plan is written. */
  planned: boolean;
  /**
   * What holds it back from the way the project works: by epic, work outside the sweep (`!ready`); card by card, any
   * unfinished blocker. Served raw by epic, it read blocked on the checkpoint a sweep named next (card://JAVA-2001).
   */
  blocked: boolean;
  /** Nothing outside the sweep holds it back: every blocker finished, or is a completed sibling. */
  ready: boolean;
  /** The epic's test card, which runs the full suite last. */
  verification: boolean;
  /** What a sweep's implementer works: an agent card, no spike, planned, not completed, ready. */
  sweepable: boolean;
  mods: string[];
}

export interface CheckpointProgress {
  completed: number;
  total: number;
}

/** The tag of an epic's test card (fast-tests.md, "Inside an epic"). */
export const EPIC_TEST_TAG = "epic-test";

export function checkpointState(status: Status): CheckpointState {
  if (status === "refine" || status === "todo") return "pending";
  return status === "doing" ? "in_progress" : "completed";
}

const finished = (status: Status) => status === "deploy" || status === "done";

/** The keys that block `card`, open or finished: the order is about the work, not about what still holds it. */
function blockersOf(card: Card): string[] {
  return [...card.blockedBy, ...card.relatedBy.filter((r) => r.direction === "blockedThis").map((r) => r.key)];
}

function boardOrder(a: Card, b: Card): number {
  const test = Number(a.tags.includes(EPIC_TEST_TAG)) - Number(b.tags.includes(EPIC_TEST_TAG));
  const sprint = Number(a.sprintId === null) - Number(b.sprintId === null);
  return test || sprint || a.rank - b.rank || a.number - b.number;
}

/** Kahn's order over the sibling edges, the board's order breaking ties, the test card last. */
function ordered(kept: Card[]): Card[] {
  const byKey = new Map(kept.map((card) => [card.key, card]));
  const waiting = new Map(kept.map((card) => [card.key, new Set(blockersOf(card).filter((key) => byKey.has(key)))]));
  const out: Card[] = [];
  while (out.length < kept.length) {
    const free = kept.filter((card) => !out.includes(card) && waiting.get(card.key)!.size === 0).sort(boardOrder);
    // A cycle cannot be stored, but a card it would strand still gets a place.
    const next = free[0] ?? kept.filter((card) => !out.includes(card)).sort(boardOrder)[0];
    out.push(next);
    waiting.forEach((blockers) => blockers.delete(next.key));
  }
  return out;
}

export function epicCheckpoints(epicKey: string, cards: readonly Card[], epicMode = false): Checkpoint[] {
  const kept = epicChildren(epicKey, cards).filter((card) => card.status !== "rejected" && card.category !== "epic");
  const byKey = new Map(cards.map((card) => [card.key, card]));
  const siblings = new Set(kept.map((card) => card.key));
  return ordered(kept).map((card) => {
    const blockers = blockersOf(card).map((key) => byKey.get(key)).filter((c): c is Card => c !== undefined);
    const state = checkpointState(card.status);
    const planned = card.status !== "refine";
    const ready = blockers.every((b) => finished(b.status) || (siblings.has(b.key) && checkpointState(b.status) === "completed"));
    return {
      id: card.id,
      key: card.key,
      title: card.title,
      status: card.status,
      state,
      category: card.category,
      executor: card.executor,
      planned,
      blocked: epicMode ? !ready : blockers.some((b) => !finished(b.status)),
      ready,
      verification: card.tags.includes(EPIC_TEST_TAG),
      sweepable: card.executor === "ai" && card.category !== "spike" && planned && state !== "completed" && ready,
      mods: [...new Set(Object.values(card.mods ?? {}).flat())],
    };
  });
}

export function checkpointProgress(checkpoints: readonly Checkpoint[]): CheckpointProgress {
  return { completed: checkpoints.filter((c) => c.state === "completed").length, total: checkpoints.length };
}

/** An epic's progress in words, as its face's tooltip and accessible name say it (card://JAVA-1873). */
export function checkpointsCompleted(progress: CheckpointProgress): string {
  return `${progress.completed} of ${progress.total} checkpoints completed`;
}

/** A card as every list serves it (card://JAVA-1873): an epic carries its progress, counted over the whole project. */
export function withCheckpointProgress(card: Card, project: readonly Card[]): Card {
  return card.category === "epic"
    ? { ...card, checkpointProgress: checkpointProgress(epicCheckpoints(card.key, project)) }
    : card;
}
