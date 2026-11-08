"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { AgentWork, Assignee, CardDetail } from "../../lib/backlog/types";
import { CardPanel } from "./CardPanel";
import { useCardPanel } from "./task-modal/use-card-panel";

export interface CardPageBodyProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  assignees: Assignee[];
  agentWork: AgentWork | undefined;
  onChanged: (next: CardDetail) => void;
  onOpenOther: (keyOrId: string) => void;
  onDeleted?: () => void;
}

/** The loaded card on its own page: the same panel and the same write hooks as the modal. */
export function CardPageBody({ projectId, repository, detail, assignees, agentWork, onChanged, onOpenOther, onDeleted }: CardPageBodyProps) {
  const panel = useCardPanel({ projectId, repository, detail, allCards: [], onChanged });
  return (
    <CardPanel
      projectId={projectId}
      repository={repository}
      detail={detail}
      panel={panel}
      projectAssignees={assignees}
      agentWork={agentWork}
      surface="page"
      onOpenOther={onOpenOther}
      onChanged={onChanged}
      onDeleted={onDeleted}
    />
  );
}
