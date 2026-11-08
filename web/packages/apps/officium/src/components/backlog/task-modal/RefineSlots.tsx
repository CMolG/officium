"use client";

import type { ReactNode } from "react";
import { MarkdownView } from "@javadaba/rich-text";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { Card } from "../../../lib/backlog/types";
import { headerLinesApart } from "../../../lib/backlog/plan-header";
import { SlotFrame, type SlotState } from "./SlotFrame";
import { WorkflowSlot, workflowState } from "./WorkflowSlot";
import { useWorkflowRun } from "./use-workflow-run";

/**
 * The two slots of a Refine card, in order (JAVA-1592): the workflow first, then the planning, which waits for it. The
 * plan's own editor (the Action plan section) is the planning slot's body once the workflow fits the card.
 */
export function RefineSlots({ projectId, repository, card, plan }: {
  projectId: string;
  repository: BacklogRepository;
  card: Pick<Card, "workflow" | "workflowProblems" | "workflowFrom" | "epic" | "actionPlan">;
  plan: ReactNode;
}) {
  const { run, retry } = useWorkflowRun(repository, projectId);
  const waiting = workflowState(card) !== "filled";
  const planState: SlotState = waiting ? "waiting" : card.actionPlan.trim() ? "filled" : "empty";
  return (
    <div data-testid="refine-slots" className="flex flex-col gap-6">
      <WorkflowSlot card={card} run={run} onRetry={retry} />
      <SlotFrame number={2} title="Planning" state={planState} testId="refine-slot-planning">
        {waiting ? (
          <>
            <p className="text-sm text-[color:var(--jd-muted)]">
              Waits for the workflow. The plan is written under its refine role, and opens with a Base line.
            </p>
            {card.actionPlan.trim() && <MarkdownView markdown={headerLinesApart(card.actionPlan)} />}
          </>
        ) : (
          plan
        )}
      </SlotFrame>
    </div>
  );
}
