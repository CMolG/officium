"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot } from "lucide-react";

import { FloatingTray, type FloatingTrayProps } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { ProjectWork } from "../../lib/backlog/types";
import { AgentWorkRow } from "../backlog/AgentWorkRow";
import { ProjectIcon } from "./ProjectIcon";

/**
 * The projects home's agent-work tray (JAVA-120): the board's `AgentWorkToast` over every project
 * the person can see. Collapsed it is the summary -- "AI is working in N projects"; expanded it
 * groups the cards by project, each with an Open that lands on the card in its project. Hidden
 * while nothing runs.
 *
 * Live on ONE stream for the whole account (`subscribeWorking`, officium-api.md §4.1), never one per
 * project, and it looks again right after the earliest `expiresAt`: a session that lapses emits
 * nothing, the same reason `Board` does it.
 */
export function AgentWorkAcrossProjects({
  repository,
  onOpen,
  onInsetChange,
  dock,
}: {
  repository: BacklogRepository;
  onOpen: (projectId: string, cardKey: string) => void;
  onInsetChange?: (px: number) => void;
  dock?: FloatingTrayProps["dock"];
}) {
  const [projects, setProjects] = useState<ProjectWork[]>([]);

  // Monitoring, not the page: a failed read keeps the last one, and the next event retries.
  const refresh = useCallback(
    () => repository.listWorkingEverywhere().then(setProjects, () => undefined),
    [repository],
  );

  useEffect(() => {
    const unsubscribe = repository.subscribeWorking((event) => {
      if (event.type === "card.working" || event.type === "stream.ready") void refresh();
    });
    void refresh();
    return unsubscribe;
  }, [repository, refresh]);

  useEffect(() => {
    const expiries = projects.flatMap((p) => p.items.map((item) => Date.parse(item.work.expiresAt)));
    if (expiries.length === 0) return;
    const timer = setTimeout(() => void refresh(), Math.max(0, Math.min(...expiries) - Date.now()) + 1000);
    return () => clearTimeout(timer);
  }, [projects, refresh]);

  const summary = `AI is working in ${projects.length} ${projects.length === 1 ? "project" : "projects"}`;
  return (
    <FloatingTray
      open={projects.length > 0}
      label="AI agents working now"
      icon={<Bot size={16} className="shrink-0 text-[color:var(--officium-agent)]" aria-hidden="true" />}
      title={`${summary} right now:`}
      collapsedTitle={summary}
      defaultCollapsed
      expandLabel="Show the projects"
      collapseLabel="Hide the projects"
      onInsetChange={onInsetChange}
      dock={dock}
    >
      <div className="flex flex-col">
        {projects.map(({ project, items }) => (
          <div key={project.id} role="group" aria-label={project.name} className="flex flex-col">
            <p className="flex flex-row items-center gap-2 px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
              <ProjectIcon icon={project.icon} color={project.iconColor} size={14} />
              <span className="truncate">{project.name}</span>
            </p>
            <ul className="flex flex-col">
              {items.map(({ work, card }) => (
                <AgentWorkRow key={work.cardId} work={work} card={card} onOpen={() => onOpen(project.id, card.key)} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </FloatingTray>
  );
}
