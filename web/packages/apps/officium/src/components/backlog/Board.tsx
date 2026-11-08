"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useState } from "react";
import { useRouter, useSearchParams } from "@javadaba/ui/navigation";

import { useTheaterScene } from "@javadaba/ui";

import { AutoloopProvider } from "../../lib/autoloop/autoloop-context";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { useViewMode } from "../../lib/backlog/view-mode";
import { EpicResolverProvider } from "./EpicBadge";
import { CardRequestsProvider } from "./CardRequestsContext";
import { HideWhoProvider } from "../../lib/backlog/hide-who-context";
import { ReadOnlyProvider } from "../../lib/backlog/read-only-context";
import { NeedsYouLane, type NeedsYouItem } from "./NeedsYouLane";
import type { ConflictInfo } from "./ConflictDialog";
import type { ViewMode } from "./TopBar";
import { BoardGate } from "./board/BoardGate";
import { BoardBanners } from "./board/BoardBanners";
import { BoardCardsArea } from "./board/BoardCardsArea";
import { BoardDialogs } from "./board/BoardDialogs";
import { BoardHeader } from "./board/BoardHeader";
import { BoardToolbar } from "./board/BoardToolbar";
import { useAgentWork } from "./board/use-agent-work";
import { useBoardDialogs } from "./board/use-board-dialogs";
import { useBoardDrag } from "./board/use-board-drag";
import { useBoardFilters } from "./board/use-board-filters";
import { useBoardMeta } from "./board/use-board-meta";
import { useCardsCopy } from "./board/use-cards-copy";
import { useIdlePrefetch } from "./board/use-idle-prefetch";
import { useLiveEvents } from "./board/use-live-events";
import { useLiveSync } from "./board/use-live-sync";
import { useOpenCard } from "./board/use-open-card";
import { useVisibleCards } from "./board/use-visible-cards";

export interface BoardProps {
  projectId: string;
  repository: BacklogRepository;
}

export function Board({ projectId, repository }: BoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The product page's Theater plays this same board; there it must not navigate the page
  // hosting it (MINIAPP_CONTRACT.md §3).
  const inTheater = useTheaterScene() !== null;
  const filters = useBoardFilters();
  // The product page's Theater always opens on the board and remembers nothing (contract §3); the
  // app opens where the person left this project, or in its width's default (JAVA-128).
  const rememberedView = useViewMode(projectId);
  const [theaterView, setTheaterView] = useState<ViewMode>("board");
  const viewMode = inTheater ? theaterView : rememberedView;
  const copy = useCardsCopy({ projectId, repository });
  const meta = useBoardMeta({ projectId, repository, copy });
  const sync = useLiveSync({ projectId, repository, liftKey: filters.liftKey, loadAround: meta.loadAround, copy });
  useIdlePrefetch(sync.cards !== null);
  const agent = useAgentWork({ working: sync.working, cards: sync.cards, refreshWorking: sync.refreshWorking });
  const live = useLiveEvents({ projectId, repository, schedule: sync.schedule, refreshWorking: sync.refreshWorking });
  const open = useOpenCard({ projectId, repository, cards: sync.cards, searchParams, router, inTheater });
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const dialogs = useBoardDialogs();
  const drag = useBoardDrag({ projectId, repository, cards: sync.cards, refresh: sync.refresh, setConflict, setError: open.setError, onSendBack: dialogs.setSendBack });
  const visible = useVisibleCards({ cards: sync.cards, previewCards: drag.previewCards, activeSprint: meta.activeSprint, filters, viewMode, isWorking: agent.isWorking });
  // Height the floating "AI is working" list covers; every scroll area below pads by it, or the
  // cards at the bottom of a column -- often the very ones being worked -- sit under the list,
  // unclickable and undraggable (found by `drag-and-drop.spec.ts` once the demo seeded work).
  // The list FLOATS over the board and never shortens it (user decision, 2026-09-15): the inset
  // pads only what scrolls -- each column's card list, and the list/stack views' own scroll box --
  // so the column boxes keep their full height.
  const [toastInset, setToastInset] = useState(0);
  // `transitionProperty: none` because the property's initial value is `all`: every padding change
  // would otherwise animate -- and under reduced motion `tokens.css` still turns it into a 0.01ms
  // transition that counts as "running" (caught by `reduced-motion.spec.ts` on `/demo`).
  const insetStyle = toastInset ? { paddingBottom: toastInset, transitionProperty: "none" } : undefined;
  // Only a view the person SWITCHED to rises in; the first paint of the board does not, so
  // nothing moves under a drag picked up the moment the board appears.
  const [viewSwitched, setViewSwitched] = useState(false);
  const { cards, rootRef } = sync;

  return (
    // `relative` is load-bearing, not decoration. Every `sr-only` label on a card is
    // `position: absolute`; with no positioned ancestor its containing block was the viewport,
    // so it escaped the board's `overflow-x-auto` and widened the DOCUMENT to ~1840px -- a
    // second horizontal scroll that moved the whole page (reported 2026-09-15). A positioned
    // root and board section make both clip what they contain.
    //
    // `h-full`, not `h-dvh`: the board fills what its container gives it -- the app shell under
    // the product bar, or the Theater's frame -- rather than claiming the browser's height.
    //
    // Below `lg` it grows instead, and the shell's scroll box scrolls it (user report, 2026-09-24:
    // on a phone the toolbar took the whole height, the cards area got none, and nothing
    // scrolled -- the board could not be reached at all). The Theater's frame keeps it fixed.
    //
    // Epics resolve against `cards`, not `displayCards` (JAVA-291): a sprint never holds its epic.
    <AutoloopProvider projectId={projectId} enabled={!inTheater}>
    <EpicResolverProvider cards={cards ?? []}>
    <CardRequestsProvider projectId={projectId} repository={repository}>
    <ReadOnlyProvider value={sync.project?.role === "viewer"}>
    <HideWhoProvider projectId={projectId} viewer={sync.project?.role === "viewer"}>
    {/* From lg the board fills the shell's height and each column scrolls on its own. It does not clip what overflows
        it (JAVA-1547): when the header, the filters and the Needs you lane leave less than the cards area's floor, the
        board as a whole scrolls in the shell, so the columns never shrink to a sliver on a laptop-height screen. */}
    <div
      ref={rootRef}
      className={`relative flex flex-col ${inTheater ? "h-full min-h-0 overflow-hidden" : "min-h-full lg:h-full"}`}
    >
      <BoardHeader
        inTheater={inTheater}
        project={sync.project}
        projectId={projectId}
        sprintName={meta.activeSprint?.name}
        setEditProjectOpen={dialogs.setEditProjectOpen}
        setMembersOpen={dialogs.setMembersOpen}
      />

      {/* card://JAVA-1820: right under the header, above the toolbar, so on a phone it is on the first screen. */}
      <BoardGate projectId={projectId} />

      <NeedsYouLane
        items={meta.needsYou.map((card): NeedsYouItem => ({ card, projectId }))}
        search={filters.searchTerm}
        onOpen={(item) => void open.openCard(item.card.id)}
        onOpenRequest={(request) => void open.openCard(request.cardId)}
      />

      <BoardToolbar
        inTheater={inTheater}
        projectId={projectId}
        filters={filters}
        epics={meta.epics}
        tags={meta.tags}
        assignees={meta.assignees}
        snapshotCards={sync.snapshotCards}
        visibleCount={visible.visibleCount}
        loggedTotal={visible.loggedTotal}
        viewMode={viewMode}
        setViewSwitched={setViewSwitched}
        setTheaterView={setTheaterView}
        setReportOpen={dialogs.setReportOpen}
        setNewCardOpen={dialogs.setNewCardOpen}
        canCreate={sync.project?.role !== "viewer"}
      />

      <BoardBanners
        live={live}
        error={open.error}
        setError={open.setError}
        errorCardId={open.errorCardId}
        openCard={(cardId) => void open.openCard(cardId)}
        activeSprint={meta.activeSprint ?? null}
        inTheater={inTheater}
        projectId={projectId}
      />

      <BoardCardsArea
        projectId={projectId}
        repository={repository}
        sync={sync}
        agent={agent}
        open={open}
        drag={drag}
        filters={filters}
        visible={visible}
        viewMode={viewMode}
        inTheater={inTheater}
        toastInset={toastInset}
        setToastInset={setToastInset}
        insetStyle={insetStyle}
        viewSwitched={viewSwitched}
        setNewCardOpen={dialogs.setNewCardOpen}
        sprintPending={meta.activeSprint === undefined}
      />

      <BoardDialogs
        projectId={projectId}
        repository={repository}
        sync={sync}
        meta={meta}
        agent={agent}
        open={open}
        filters={filters}
        dialogs={dialogs}
        conflict={conflict}
        setConflict={setConflict}
      />
    </div>
    </HideWhoProvider>
    </ReadOnlyProvider>
    </CardRequestsProvider>
    </EpicResolverProvider>
    </AutoloopProvider>
  );
}
