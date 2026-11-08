"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { Assignee, CardDetail } from "../../../lib/backlog/types";
import { AddSignalDialog } from "../AddSignalDialog";
import { AssigneeModal } from "../AssigneeModal";
import type { ConflictInfo } from "../ConflictDialog";
import { ReviewExitDialog } from "../ReviewExitDialog";
import { TimeTrackingDialog } from "../TimeTrackingDialog";
import { END_OF_COLUMN } from "./use-card-writes";
import type { OnChanged } from "./types";
import type { CardSignals } from "./use-card-signals";
import type { CardWrites } from "./use-card-writes";

export interface TaskModalDialogsProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  projectAssignees: Assignee[];
  writes: CardWrites;
  signals: CardSignals;
  timeTrackingOpen: boolean;
  setTimeTrackingOpen: (open: boolean) => void;
  onChanged: OnChanged;
  onConflict?: (info: ConflictInfo) => void;
}

/** The three dialogs a card opens from its sidebar. */
export function TaskModalDialogs({ projectId, repository, detail, projectAssignees, writes, signals, timeTrackingOpen, setTimeTrackingOpen, onChanged, onConflict }: TaskModalDialogsProps) {
  const { assigneeModalOpen, setAssigneeModalOpen, saveAssignees, sendBackTo, setSendBackTo } = writes;
  const { addSignalOpen, setAddSignalOpen, addSignal } = signals;
  return (
    <>
      {assigneeModalOpen && (
        <AssigneeModal
          current={detail.assignees}
          projectAssignees={projectAssignees}
          onClose={() => setAssigneeModalOpen(false)}
          onSave={(next) => {
            setAssigneeModalOpen(false);
            void saveAssignees(next);
          }}
        />
      )}

      {addSignalOpen && (
        <AddSignalDialog
          projectId={projectId}
          repository={repository}
          current={detail.signals}
          onClose={() => setAddSignalOpen(false)}
          onAdd={(signal) => void addSignal(signal)}
        />
      )}

      {sendBackTo && (
        <ReviewExitDialog
          projectId={projectId}
          repository={repository}
          card={detail}
          to={sendBackTo}
          position={END_OF_COLUMN}
          // The move answers the card, not its comments: read the detail again so the findings show.
          onSent={async () => onChanged(await repository.getCard(projectId, detail.id))}
          onClose={() => setSendBackTo(null)}
        />
      )}

      {timeTrackingOpen && (
        <TimeTrackingDialog
          projectId={projectId}
          repository={repository}
          detail={detail}
          onClose={() => setTimeTrackingOpen(false)}
          onChanged={onChanged}
          onConflict={onConflict}
        />
      )}
    </>
  );
}
