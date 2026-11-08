"use client";

import { useEffect, useState } from "react";

import type { getBacklogRepository } from "../../lib/backlog/get-repository";
import { TaskModal } from "./TaskModal";

export function BacklogCardDetail({
  projectId,
  cardId,
  repository,
  onClose,
  onChanged,
}: {
  projectId: string;
  cardId: string;
  repository: ReturnType<typeof getBacklogRepository>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof repository.getCard>> | null>(null);
  useEffect(() => {
    let cancelled = false;
    void repository.getCard(projectId, cardId).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, cardId, repository]);
  if (!detail) return null;
  return (
    <TaskModal
      projectId={projectId}
      repository={repository}
      detail={detail}
      allCards={[]}
      projectAssignees={[]}
      onClose={onClose}
      onOpenOther={() => {}}
      onChanged={async (next) => {
        setDetail(next);
        onChanged();
      }}
      onConflict={() => {}}
    />
  );
}
