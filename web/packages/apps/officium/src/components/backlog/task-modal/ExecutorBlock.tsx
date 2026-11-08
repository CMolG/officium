"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { Bot, UserRound } from "lucide-react";

import { Select, ToggleGroup, ToggleGroupItem } from "@javadaba/ui";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { CardDetail, Executor, RunState } from "../../../lib/backlog/types";
import { QueueToWindow } from "../QueueToWindow";

const RUN_STATE_OPTIONS: { value: RunState; label: string }[] = [
  { value: "idle", label: "Idle" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

/** JAVA-292's two rules, in the words the disabled controls give as their reason. */
const EPIC_NOT_RUN = "An epic is worked through its children";

export interface ExecutorBlockProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  isEpic: boolean;
  changeExecutor: (next: Executor) => Promise<void>;
  changeRunState: (next: RunState) => Promise<void>;
}

/** Who does the card, its run state and the agent-window queue. */
export function ExecutorBlock({ projectId, repository, detail, isEpic, changeExecutor, changeRunState }: ExecutorBlockProps) {
  return (
    <>
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Who does it</h3>
        <ToggleGroup
          type="single"
          value={detail.executor}
          onValueChange={(v) => v && void changeExecutor(v as Executor)}
          aria-label="Who does it"
          className="justify-start gap-1.5"
        >
          <ToggleGroupItem value="ai" variant="outline" size="sm" aria-label="AI agent">
            <Bot size={14} /> AI
          </ToggleGroupItem>
          <ToggleGroupItem value="human" variant="outline" size="sm" aria-label="A person">
            <UserRound size={14} /> Human
          </ToggleGroupItem>
        </ToggleGroup>
        {/* A human card is never run: no run-state control shows for it (JDB-239). */}
        {detail.executor === "ai" ? (
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Run state</span>
            <Select
              aria-label="Run state"
              value={detail.runState}
              onChange={(v) => void changeRunState(v as RunState)}
              options={
                isEpic
                  ? RUN_STATE_OPTIONS.map((o) =>
                      o.value === "running" ? { ...o, disabled: true, description: EPIC_NOT_RUN } : o,
                    )
                  : RUN_STATE_OPTIONS
              }
            />
            {isEpic && <span className="text-xs text-[color:var(--jd-muted)]">{EPIC_NOT_RUN}, never run itself.</span>}
          </label>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--jd-muted)]">Human cards are never run automatically.</p>
        )}
      </div>
      {detail.executor === "ai" && !isEpic && detail.status !== "done" && detail.status !== "rejected" && (
        <QueueToWindow projectId={projectId} cardId={detail.id} cardKey={detail.key} repository={repository} />
      )}
    </>
  );
}
