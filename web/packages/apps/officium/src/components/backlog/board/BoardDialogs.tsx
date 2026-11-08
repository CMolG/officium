"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { lazy, Suspense } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import { CardEditorLoading } from "../CardEditorLoading";
import { ConflictDialog, type ConflictInfo } from "../ConflictDialog";
import { ReportModal } from "../ReportModal";
import { ReviewExitDialog } from "../ReviewExitDialog";
import { EditProjectDialog } from "../../projects/EditProjectDialog";
import { MembersDialog } from "../../projects/MembersDialog";
import type { AgentWorkState } from "./use-agent-work";
import type { BoardDialogsState } from "./use-board-dialogs";
import type { BoardFilters } from "./use-board-filters";
import type { BoardMeta } from "./use-board-meta";
import type { LiveSync } from "./use-live-sync";
import type { OpenCard } from "./use-open-card";

// The editors load when they open (JAVA-1647). Their Suspense fallback is rendered here, not by the
// lazy module, so the stand-in gets this board's own close: a cancelled open removes it at once.
const TaskModal = lazy(() => import("../TaskModal").then((m) => ({ default: m.TaskModal })));
const CreateCardDialog = lazy(() => import("../CreateCardDialog").then((m) => ({ default: m.CreateCardDialog })));

export interface BoardDialogsProps {
  projectId: string;
  repository: BacklogRepository;
  sync: LiveSync;
  meta: BoardMeta;
  agent: AgentWorkState;
  open: OpenCard;
  filters: BoardFilters;
  dialogs: BoardDialogsState;
  conflict: ConflictInfo | null;
  setConflict: (info: ConflictInfo | null) => void;
}

/** The dialogs the board opens: the card, a conflict, the report, a new card, the members and the project. */
export function BoardDialogs({ projectId, repository, sync, meta, agent, open, filters, dialogs, conflict, setConflict }: BoardDialogsProps) {
  const { cards, refresh, project, setProject } = sync;
  const { assignees, activeSprint } = meta;
  const { workingByCard } = agent;
  const { selectedDetail, setSelectedDetail, closeCard, openCard } = open;
  const { activeStatuses } = filters;
  const { reportOpen, setReportOpen, newCardOpen, setNewCardOpen, membersOpen, setMembersOpen, editProjectOpen, setEditProjectOpen } = dialogs;
  return (
    <>
      {selectedDetail && (
        <Suspense fallback={<CardEditorLoading onClose={closeCard} />}>
          <TaskModal
            projectId={projectId}
            repository={repository}
            detail={selectedDetail}
            allCards={cards ?? []}
            projectAssignees={assignees}
            agentWork={workingByCard.get(selectedDetail.id)}
            onClose={closeCard}
            onOpenOther={(id) => void openCard(id)}
            onChanged={async (next) => {
              setSelectedDetail(next);
              await refresh();
            }}
            onConflict={setConflict}
          />
        </Suspense>
      )}

      {dialogs.sendBack && (
        <ReviewExitDialog
          projectId={projectId}
          repository={repository}
          card={dialogs.sendBack.card}
          to={dialogs.sendBack.to}
          position={dialogs.sendBack.position}
          onSent={refresh}
          onClose={() => dialogs.setSendBack(null)}
        />
      )}

      {conflict && <ConflictDialog info={conflict} onClose={() => setConflict(null)} />}

      {reportOpen && <ReportModal projectId={projectId} onClose={() => setReportOpen(false)} />}

      {newCardOpen && (
        <Suspense fallback={<CardEditorLoading onClose={() => setNewCardOpen(false)} />}>
          <CreateCardDialog
            defaultStatus={activeStatuses[0] ?? "todo"}
            projectAssignees={assignees}
            onClose={() => setNewCardOpen(false)}
            onCreate={async (input) => {
              await repository.createCard(projectId, {
                title: input.title,
                description: input.description,
                status: input.status,
                priority: input.priority,
                executor: input.executor,
                category: input.category,
                ...(input.subtype ? { subtype: input.subtype } : {}),
                assignees: input.assignee ? [input.assignee] : undefined,
                // A card created while a sprint is active stays visible on the filtered board
                // (officium-api.md §8.2, coordinated with the API side 2026-09-24).
                sprintId: activeSprint?.id ?? null,
              });
              setNewCardOpen(false);
              await refresh();
            }}
          />
        </Suspense>
      )}

      {membersOpen && (
        <MembersDialog
          projectId={projectId}
          repository={repository}
          isOwner={project?.role === "owner"}
          onClose={() => setMembersOpen(false)}
        />
      )}

      {editProjectOpen && project && (
        <EditProjectDialog
          project={project}
          repository={repository}
          onClose={() => setEditProjectOpen(false)}
          onChanged={(next) => setProject(next)}
        />
      )}
    </>
  );
}
