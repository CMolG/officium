"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { BoardCard } from "../../../lib/backlog/board-copy";
import type { CardDetail } from "../../../lib/backlog/types";
import { CardRoles } from "../CardRoles";
import { CategoryBlock } from "./CategoryBlock";
import { ExecutorBlock } from "./ExecutorBlock";
import { HistoryBlock } from "./HistoryBlock";
import { SidebarFacts } from "./SidebarFacts";
import { RankedByBlock } from "./RankedByBlock";
import { SignalsBlock } from "./SignalsBlock";
import type { CardSignals } from "./use-card-signals";
import type { CardWrites } from "./use-card-writes";

export interface TaskModalSidebarProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  isEpic: boolean;
  writes: CardWrites;
  signals: CardSignals;
  sprints: Parameters<typeof SidebarFacts>[0]["sprints"];
  sprint: Parameters<typeof SidebarFacts>[0]["sprint"];
  setTimeTrackingOpen: (open: boolean) => void;
  cards: BoardCard[];
}

/** The right-hand column: who does it, category, signals, roles, facts and history. */
export function TaskModalSidebar({ projectId, repository, detail, isEpic, writes, signals, sprints, sprint, setTimeTrackingOpen, cards }: TaskModalSidebarProps) {
  const { changeExecutor, changeRunState, changeCategory, changeSubtype, setAssigneeModalOpen, saveFields } = writes;
  const { removedSignal, removeSignal, undoRemoveSignal, setAddSignalOpen } = signals;
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-5 md:sticky md:top-0 md:h-fit md:w-64">
      <ExecutorBlock
        projectId={projectId}
        repository={repository}
        detail={detail}
        isEpic={isEpic}
        changeExecutor={changeExecutor}
        changeRunState={changeRunState}
      />
      <CategoryBlock detail={detail} changeCategory={changeCategory} changeSubtype={changeSubtype} />
      <SignalsBlock
        detail={detail}
        removedSignal={removedSignal}
        removeSignal={removeSignal}
        undoRemoveSignal={undoRemoveSignal}
        setAddSignalOpen={setAddSignalOpen}
      />
      <RankedByBlock detail={detail} />
      <CardRoles card={detail} />
      <SidebarFacts
        detail={detail}
        sprints={sprints}
        sprint={sprint}
        setTimeTrackingOpen={setTimeTrackingOpen}
        setAssigneeModalOpen={setAssigneeModalOpen}
        cards={cards}
        saveFields={saveFields}
      />
      <HistoryBlock detail={detail} repository={repository} />
    </aside>
  );
}
