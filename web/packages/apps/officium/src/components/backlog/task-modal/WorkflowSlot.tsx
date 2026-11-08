"use client";

import type { Card } from "../../../lib/backlog/types";
import { EmptyWorkflow } from "./EmptyWorkflow";
import { SlotFrame, type SlotState } from "./SlotFrame";
import { WorkflowPicks } from "./WorkflowPicks";
import type { WorkflowRun } from "./use-workflow-run";

/**
 * Whether the workflow slot is filled, empty, or holds a workflow that no longer fits the card (JAVA-1592). A card whose
 * epic's workflow has no part for it (JAVA-1885) is invalid too: the epic's workflow is the one to fix.
 */
export function workflowState(card: Pick<Card, "workflow" | "workflowProblems" | "workflowFrom">): SlotState {
  if (!card.workflow) return card.workflowFrom && (card.workflowProblems ?? []).length > 0 ? "invalid" : "empty";
  return (card.workflowProblems ?? []).length > 0 ? "invalid" : "filled";
}

function invalidLine(card: Pick<Card, "workflow" | "workflowFrom">): string {
  if (!card.workflow) return `Its epic ${card.workflowFrom}'s workflow has no part for this card's category. Add one there.`;
  return card.workflowFrom
    ? `This workflow no longer fits the card. Write it again on its epic ${card.workflowFrom}.`
    : "This workflow no longer fits the card. Write it again.";
}

/** The first slot of a Refine card: the role and mods of each phase, written before the plan (JAVA-1592). */
export function WorkflowSlot({ card, run, onRetry }: {
  card: Pick<Card, "workflow" | "workflowProblems" | "workflowFrom" | "epic">;
  run: WorkflowRun;
  onRetry: () => void;
}) {
  const state = workflowState(card);
  return (
    <SlotFrame number={1} title="Workflow" state={state} testId="refine-slot-workflow">
      {card.workflowFrom && (
        <p data-testid="workflow-from" className="text-sm text-[color:var(--jd-muted)]">
          {`From its epic ${card.workflowFrom}: an epic's workflow is written once, for all its cards.`}
        </p>
      )}
      {state === "filled" && card.workflow && <WorkflowPicks workflow={card.workflow} />}
      {state === "invalid" && (
        <>
          <p role="alert" className="text-sm font-medium">{invalidLine(card)}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {(card.workflowProblems ?? []).map((problem) => (
              <li key={`${problem.phase}:${problem.message}`}>
                <span>{`${problem.phase}: ${problem.message}`}</span>
              </li>
            ))}
          </ul>
          {card.workflow && <WorkflowPicks workflow={card.workflow} />}
        </>
      )}
      {state === "empty" && <EmptyWorkflow run={run} onRetry={onRetry} epic={card.epic} />}
    </SlotFrame>
  );
}
