"use client";

import { useCallback, useMemo, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { useBoardSensors } from "../../lib/backlog/dnd-sensors";
import { isConflict, type Sprint } from "../../lib/backlog/types";
import { matchesSearch } from "../../lib/backlog/card-search";
import { useBacklogSearch } from "../../lib/backlog/use-backlog-search";
import { lazy, Suspense } from "react";
import { EpicResolverProvider } from "./EpicBadge";
import { BacklogTitleRow } from "./BacklogTitleRow";
import { CardEditorLoading } from "./CardEditorLoading";
import { BacklogSearch } from "./BacklogSearch";
import { ConfirmDeleteSprint } from "./ConfirmDeleteSprint";
import { BACKLOG_BLOCK, useFoldedSprints } from "../../lib/backlog/folded-sprints";
import { SprintSection } from "./SprintSection";
import { CreateSprintDialog, EditSprintDialog, StartSprintDialog, CompleteSprintDialog } from "./SprintDialogs";
import { isFinished, useBacklogData } from "./use-backlog-data";
import { useIdlePrefetch } from "./board/use-idle-prefetch";

// The card detail carries the rich-text editor (JAVA-1647): it loads when a card opens, not with the Backlog.
const BacklogCardDetail = lazy(() => import("./BacklogCardDetail").then((m) => ({ default: m.BacklogCardDetail })));

/** Warms the card detail once the Backlog's first read has answered, so a card opens without a skeleton. */
const prefetchCardDetail = () => {
  void import("./BacklogCardDetail");
};

/** JAVA-290, the API's `epic_not_plannable` said before it is asked: a sprint holds an epic's children. */
const epicNotPlannable = (key: string) =>
  `${key} is an epic, and epics aren't planned into a sprint: plan its children, which carry its badge.`;

/**
 * Sprint planning (JAVA-54): the active sprint on top, planned sprints in `order`, then the
 * backlog. Drag a card between sections with the board's own `@dnd-kit` setup, or use "Move to…"
 * from the keyboard. Mirrors `Board`'s own load/subscribe/conflict shape so the two views behave
 * the same way under a flaky connection.
 */
export function BacklogView({ projectId }: { projectId: string }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const sensors = useBoardSensors();
  const { folded, toggle: toggleFold } = useFoldedSprints(projectId);
  const { query, setQuery } = useBacklogSearch(projectId);
  // The open cards come from the board's copy; the epics name a child's badge, finished ones too (JAVA-291).
  const { project, sprints, cards, epics, error: loadError, refresh } = useBacklogData(projectId, repository);
  useIdlePrefetch(cards !== null, prefetchCardDetail);

  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editSprint, setEditSprint] = useState<Sprint | null>(null);
  const [startSprint, setStartSprint] = useState<Sprint | null>(null);
  const [completeSprint, setCompleteSprint] = useState<Sprint | null>(null);
  const [deleteSprint, setDeleteSprint] = useState<Sprint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSprint = sprints?.find((s) => s.state === "active") ?? null;
  const plannedSprints = sprints?.filter((s) => s.state === "planned").sort((a, b) => a.order - b.order) ?? [];

  const cardsIn = useCallback((sprintId: string | null) => (cards ?? []).filter((c) => c.sprintId === sprintId).sort((a, b) => a.rank - b.rank), [cards]);
  // What the search box lets through, per block: the drop positions below still count every card.
  const shownIn = (sprintId: string | null) => cardsIn(sprintId).filter((c) => matchesSearch(c, query));

  async function moveCard(cardId: string, targetSprintId: string | null, position: number) {
    const card = (cards ?? []).find((c) => c.id === cardId);
    if (!card) return;
    if (card.category === "epic" && targetSprintId !== null) {
      setError(epicNotPlannable(card.key));
      return;
    }
    const result = await repository.setCardSprint(projectId, cardId, { expectedVersion: card.version, sprintId: targetSprintId, position });
    if (isConflict(result)) setError("That card changed elsewhere -- reload to see the latest.");
    await refresh();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const overCard = (cards ?? []).find((c) => c.id === overId);
    const targetSprintId = overId.startsWith("sprint:")
      ? overId === "sprint:backlog" ? null : overId.slice("sprint:".length)
      : (overCard?.sprintId ?? null);
    const bucket = cardsIn(targetSprintId).filter((c) => c.id !== activeId);
    const position = overCard ? Math.max(0, bucket.findIndex((c) => c.id === overId)) : bucket.length;
    void moveCard(activeId, targetSprintId, position);
  }

  // A failed read with cards in hand keeps them on screen; the error goes in the banner beside them.
  if (loadError && !cards) {
    return (
      <div className="officium-rise mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <BacklogTitleRow projectId={projectId} project={project} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
          <p className="text-sm font-semibold text-[color:var(--jd-ink)]">Couldn't load the backlog</p>
          <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-muted)]">{loadError}</p>
          <Button type="button" register="ui" onClick={() => void refresh()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!project || !sprints || !cards) {
    return (
      <div className="officium-rise mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <BacklogTitleRow projectId={projectId} project={project} />
        <div className="flex flex-1 flex-row items-center justify-center text-sm text-[color:var(--jd-muted)]">
          <Text>Loading the backlog…</Text>
        </div>
      </div>
    );
  }

  const backlogCards = cardsIn(null);
  const isEmpty = sprints.length === 0 && backlogCards.length === 0;
  const searching = query.trim() !== "";
  const noMatch = searching && !cards.some((c) => matchesSearch(c, query));
  const blockProps = (sprintId: string | null) => ({ cards: shownIn(sprintId), total: cardsIn(sprintId).length, searching });

  return (
    <EpicResolverProvider cards={epics}>
    <div className="officium-rise mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
      <BacklogTitleRow projectId={projectId} project={project}>
        <Button type="button" register="ui" size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Create sprint
        </Button>
      </BacklogTitleRow>

      {!isEmpty && <BacklogSearch value={query} onChange={setQuery} />}

      {(error ?? loadError) && (
        <p role="alert" className="rounded-[var(--radius-jd-md)] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error ?? loadError}
        </p>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] px-6 py-16 text-center">
          <p className="text-sm font-semibold text-[color:var(--jd-ink)]">Plan this project's first sprint</p>
          <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-muted)]">
            Every card is in the backlog until it's planned into one.
          </p>
          <Button type="button" register="ui" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Create sprint
          </Button>
        </div>
      ) : noMatch ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] px-6 py-16 text-center">
          <p className="text-sm font-semibold text-[color:var(--jd-ink)]">No card matches &ldquo;{query.trim()}&rdquo;</p>
          <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-muted)]">
            The search reads each card&apos;s key, title, summary, epic and tags, in every sprint and the Backlog.
          </p>
          <Button type="button" register="ui" variant="outline" onClick={() => setQuery("")}>Clear search</Button>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-5">
            {activeSprint && (
              <SprintSection
                sprint={activeSprint}
                {...blockProps(activeSprint.id)}
                allSprints={sprints}
                onOpenCard={setOpenCardId}
                onMoveCard={moveCard}
                onComplete={() => setCompleteSprint(activeSprint)}
                onEdit={() => setEditSprint(activeSprint)}
                folded={folded.has(activeSprint.id)}
                onToggleFold={() => toggleFold(activeSprint.id)}
              />
            )}
            {plannedSprints.map((sprint) => (
              <SprintSection
                key={sprint.id}
                sprint={sprint}
                {...blockProps(sprint.id)}
                allSprints={sprints}
                onOpenCard={setOpenCardId}
                onMoveCard={moveCard}
                onStart={() => setStartSprint(sprint)}
                onEdit={() => setEditSprint(sprint)}
                onDelete={() => setDeleteSprint(sprint)}
                startDisabledReason={activeSprint ? `${activeSprint.name} is already active. Complete it first.` : null}
                folded={folded.has(sprint.id)}
                onToggleFold={() => toggleFold(sprint.id)}
              />
            ))}
            <SprintSection
              sprint={null}
              {...blockProps(null)}
              allSprints={sprints}
              onOpenCard={setOpenCardId}
              onMoveCard={moveCard}
              folded={folded.has(BACKLOG_BLOCK)}
              onToggleFold={() => toggleFold(BACKLOG_BLOCK)}
            />
          </div>
        </DndContext>
      )}

      {openCardId && (
        <Suspense fallback={<CardEditorLoading onClose={() => setOpenCardId(null)} />}>
          <BacklogCardDetail projectId={projectId} cardId={openCardId} repository={repository} onClose={() => setOpenCardId(null)} onChanged={refresh} />
        </Suspense>
      )}

      {createOpen && (
        <CreateSprintDialog
          onClose={() => setCreateOpen(false)}
          onCreate={async (input) => {
            await repository.createSprint(projectId, input);
            setCreateOpen(false);
            await refresh();
          }}
        />
      )}
      {editSprint && (
        <EditSprintDialog
          sprint={editSprint}
          onClose={() => setEditSprint(null)}
          onSave={async (input) => {
            const result = await repository.updateSprint(projectId, editSprint.id, { expectedVersion: editSprint.version, ...input });
            await refresh();
            return !isConflict(result);
          }}
        />
      )}
      {startSprint && (
        <StartSprintDialog
          sprint={startSprint}
          disabledReason={activeSprint ? `${activeSprint.name} is already active. Complete it first.` : null}
          onClose={() => setStartSprint(null)}
          onStart={async (input) => {
            await repository.startSprint(projectId, startSprint.id, { expectedVersion: startSprint.version, ...input });
            setStartSprint(null);
            await refresh();
          }}
        />
      )}
      {completeSprint && (
        <CompleteSprintDialog
          sprint={completeSprint}
          openCards={cardsIn(completeSprint.id).filter((c) => !isFinished(c.status))}
          otherSprints={plannedSprints.filter((s) => s.id !== completeSprint.id)}
          onClose={() => setCompleteSprint(null)}
          onComplete={async (moveOpenCardsTo) => {
            await repository.completeSprint(projectId, completeSprint.id, { expectedVersion: completeSprint.version, moveOpenCardsTo });
            setCompleteSprint(null);
            await refresh();
          }}
        />
      )}
      {deleteSprint && (
        <ConfirmDeleteSprint
          sprint={deleteSprint}
          onClose={() => setDeleteSprint(null)}
          onConfirm={async () => {
            await repository.deleteSprint(projectId, deleteSprint.id, deleteSprint.version);
            setDeleteSprint(null);
            await refresh();
          }}
        />
      )}
    </div>
    </EpicResolverProvider>
  );
}
