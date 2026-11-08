"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { Clock, User } from "lucide-react";

import { Text } from "@javadaba/ui";

import type { BoardCard } from "../../../lib/backlog/board-copy";
import { useHideWho } from "../../../lib/backlog/hide-who-context";
import { useReadOnly } from "../../../lib/backlog/read-only-context";
import type { CardDetail, Priority, Sprint } from "../../../lib/backlog/types";
import { EpicBlock } from "./EpicBlock";
import { PriorityBlock } from "./PriorityBlock";
import { TagsBlock } from "./TagsBlock";
import { totalHours } from "../../../lib/backlog/format";

export interface SidebarFactsProps {
  detail: CardDetail;
  sprints: Sprint[] | null;
  sprint: Sprint | null;
  setTimeTrackingOpen: (open: boolean) => void;
  setAssigneeModalOpen: (open: boolean) => void;
  /** The board's cards: the epics an epic is chosen from. */
  cards: BoardCard[];
  saveFields: (patch: { priority?: Priority; epic?: string | null; tags?: string[] }) => Promise<void>;
}

/** Priority, epic, sprint, time, tags and assignees. Priority, epic and tags change here, for an editor. */
export function SidebarFacts({ detail, sprints, sprint, setTimeTrackingOpen, setAssigneeModalOpen, cards, saveFields }: SidebarFactsProps) {
  const readOnly = useReadOnly();
  const hideWho = useHideWho();
  const logged = totalHours(detail.timeEntries);
  return (
    <>
      <PriorityBlock detail={detail} readOnly={readOnly} save={(priority) => saveFields({ priority })} />
      <EpicBlock detail={detail} cards={cards} readOnly={readOnly} save={(epic) => saveFields({ epic })} />
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Sprint</h3>
        {/* Read-only (JAVA-197): where a card is planned is decided on the Backlog view, not
            here. `sprints === null` is the one tick before the fetch above resolves. */}
        <p data-testid="card-sprint" className="text-sm font-semibold">
          {detail.sprintId === null ? (
            "Backlog"
          ) : sprints === null ? (
            "…"
          ) : sprint ? (
            <>
              {sprint.name}
              {sprint.state !== "active" && (
                <span className="font-medium text-[color:var(--jd-muted)]"> ({sprint.state})</span>
              )}
            </>
          ) : (
            "Backlog"
          )}
        </p>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Estimate / logged</h3>
        {/* JAVA-198: the readout is now the trigger for the Time Tracking dialog, where
            logging, deleting an entry and editing the estimate all happen. */}
        <button
          type="button"
          data-testid="card-estimate"
          onClick={() => setTimeTrackingOpen(true)}
          aria-label={`Time tracking: ${logged.toFixed(2)}h logged of ${detail.estimate}h estimated`}
          className="flex min-h-11 w-full flex-row items-center gap-2 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] px-3 py-1.5 text-lg font-bold tabular-nums transition-colors hover:border-[color:var(--jd-ink)]/40"
        >
          <Clock size={16} aria-hidden="true" /> <Text>{detail.estimate}h / {logged.toFixed(2)}h</Text>
        </button>
      </div>
      <TagsBlock detail={detail} readOnly={readOnly} save={(tags) => saveFields({ tags })} />
      {!hideWho && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Assignees</h3>
          <div className="flex flex-col gap-2">
            {detail.assignees.length === 0 && <p className="text-sm text-[color:var(--jd-muted)]">Unassigned</p>}
            {detail.assignees.map((a) => (
              <div key={a.name} className="flex flex-row items-center gap-2 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] px-3 py-2 text-sm">
                <User size={16} />
                <span className="min-w-0 truncate">{a.name}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setAssigneeModalOpen(true)} className="mt-1 min-h-11 text-sm font-semibold underline underline-offset-4">
            <Text>Manage assignees</Text>
          </button>
        </div>
      )}
    </>
  );
}
