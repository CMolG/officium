import type { Status } from "./types";

/**
 * An epic's status follows its children's (card://JAVA-379). The API decides it
 * (`EpicStatus.java`); this is the in-memory backend's half, and the board's reason for disabling
 * an epic's status controls. A child is open until it is closed: done, or rejected
 * (card://JAVA-1415). A rejected child never pulls its epic anywhere.
 */

/** Board order, Completed then Rejected last: the API's `Status` declaration order. */
const ORDER: readonly Status[] = ["refine", "todo", "doing", "ready", "review", "deploy", "done", "rejected"];
const rank = (status: Status) => ORDER.indexOf(status);
const closed = (status: Status) => status === "done" || status === "rejected";

/** No children, or only rejected ones: refine. Every other child done: review (the goal is verified
 *  there, never closed by itself). Otherwise the lowest open child, raised to doing once any child
 *  has started. */
export function deriveEpicStatus(children: readonly Status[]): Status {
  const kept = children.filter((s) => s !== "rejected");
  if (kept.length === 0) return "refine";
  if (kept.every((s) => s === "done")) return "review";
  const lowestOpen = kept.filter((s) => s !== "done").reduce((a, b) => (rank(b) < rank(a) ? b : a));
  const started = kept.some((s) => rank(s) >= rank("doing"));
  return started && rank(lowestOpen) < rank("doing") ? "doing" : lowestOpen;
}

/** The status an epic in `current` takes now, or null when it stays: one a person closed (deploy,
 *  done or rejected) is theirs while none of its children is open. */
export function followEpicStatus(current: Status, children: readonly Status[]): Status | null {
  const closedByAPerson = current === "deploy" || closed(current);
  if (closedByAPerson && children.every(closed)) return null;
  const derived = deriveEpicStatus(children);
  return derived === current ? null : derived;
}

/** Where a person may move an epic by hand: anywhere while it has no children (JAVA-292 rules that
 *  case), only among review, deploy and done -- or to rejected -- once none is open, and nowhere
 *  otherwise. */
export function epicMovableTo(childCount: number, openChildren: number, target: Status): boolean {
  if (childCount === 0) return true;
  return openChildren === 0 && (target === "review" || target === "deploy" || target === "done" || target === "rejected");
}

/** The API's refusal of a person's move of an epic with children, or null when it is allowed. A
 *  rejected epic is left to the rejection rules, which reopen it only in refine. */
export function epicMoveRefusal(
  current: Status,
  children: readonly Status[],
  target: Status,
): { code: "epic_children_open" | "epic_status_derived"; message: string } | null {
  if (current === "rejected") return null;
  const open = children.filter((s) => !closed(s)).length;
  if (epicMovableTo(children.length, open, target)) return null;
  if (target === "rejected") {
    return {
      code: "epic_children_open",
      message: `An epic is rejected once none of its children is open: finish or reject its ${open} open ${open === 1 ? "child" : "children"} first`,
    };
  }
  if (target === "done" && open > 0) {
    return {
      code: "epic_children_open",
      message: `An epic closes when its children do: ${open} of its ${children.length} ${children.length === 1 ? "child" : "children"} ${open === 1 ? "is" : "are"} still open`,
    };
  }
  return {
    code: "epic_status_derived",
    message:
      "An epic's status follows its children: move them, and it follows. Once every child is done it can go between review, deploy and done",
  };
}
