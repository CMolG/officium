import { planHeaderProblems } from "./plan-header";
import type { Card, Status, WorkflowProblem } from "./types";

type GateCard = Pick<Card, "executor" | "category" | "status" | "actionPlan"> &
  Partial<Pick<Card, "workflow" | "workflowProblems" | "workflowFrom">>;

/** A routine's runbook is its plan, a hotfix refines express, and an epic plans through its children. */
export function exemptFrom(category: Card["category"]): boolean {
  return category === "routine" || category === "hotfix" || category === "epic";
}

/**
 * `PlanContract.requireExit` on the server (JAVA-915, JAVA-1592): an `ai` card leaves Refine for To do or In progress
 * only once its workflow fits it and names a refine role, and its action plan opens with `Base:` and carries that
 * role. Every missing slot is named in one refusal. The refusal in words, or null when the move may go.
 */
export function planRefusal(card: GateCard, to: Status): string | null {
  if (card.status !== "refine" || (to !== "todo" && to !== "doing") || card.executor === "human" || exemptFrom(card.category)) {
    return null;
  }
  const missing = [...workflowProblems(card), ...planHeaderProblems(card.actionPlan ?? "", refineRoleOf(card))];
  if (missing.length === 0) return null;
  return `Refine contract, exit: ${missing.join("; ")}. Fix each before the card leaves Refine for ${to}.`;
}

/** `PlanContract.requireWorkflowFirst` (JAVA-1592): an `ai` card in Refine with no workflow takes no new plan. */
export function workflowFirstRefusal(card: Pick<GateCard, "executor" | "category" | "status" | "workflow" | "actionPlan">,
  nextPlan: string): string | null {
  const setting = nextPlan.trim() !== "" && nextPlan !== card.actionPlan;
  if (card.executor !== "ai" || exemptFrom(card.category) || card.status !== "refine" || card.workflow || !setting) return null;
  return "The action plan is written after the workflow. Set the workflow first (cards.setWorkflow): its refine role is "
    + "the one the plan is written under.";
}

/** The workflow slot's problems: none, or one sentence that names the slot. */
function workflowProblems(card: GateCard): string[] {
  // Its epic's workflow governs it but has no part for its row (JAVA-1885): the server names where to add one.
  if (!card.workflow && card.workflowFrom) return (card.workflowProblems ?? []).map((p) => p.message);
  if (!card.workflow) return ["the card has no workflow (write it first, cards.setWorkflow)"];
  const stale: WorkflowProblem[] = card.workflowProblems ?? [];
  if (stale.length > 0) {
    return [`the workflow no longer fits the card: ${stale.map((p) => `${p.phase}: ${p.message}`).join("; ")}`];
  }
  return card.workflow.phases.refine ? [] : ["the workflow names no role for refine"];
}

function refineRoleOf(card: GateCard): string | null {
  return card.workflow?.phases.refine?.role ?? null;
}
