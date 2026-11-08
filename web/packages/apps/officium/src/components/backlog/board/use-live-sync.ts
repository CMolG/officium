"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "../../../lib/backlog/api-error";
import { mergeChanges, type BoardCard } from "../../../lib/backlog/board-copy";
import { forgetBoardStore, writeBoardCards, writeBoardHeader } from "../../../lib/backlog/local-store/board-store";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { AgentWork, Project } from "../../../lib/backlog/types";
import { useCardFlip } from "../../../lib/backlog/use-card-flip";
import type { CardsCopy } from "./use-cards-copy";

export interface LiveSyncInput {
  projectId: string;
  repository: BacklogRepository;
  liftKey: string;
  loadAround: () => Promise<void>;
  copy: CardsCopy;
}

/** The board's cards and the agents' work, kept current: the catch-up, its coalescing and the flip of the cards that move. */
export function useLiveSync({ projectId, repository, liftKey, loadAround, copy }: LiveSyncInput) {
  const [project, setProject] = useState<Project | null>(null);
  const [cards, setCards] = useState<BoardCard[] | null>(null);
  const [working, setWorking] = useState<AgentWork[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Which cards an agent works on: when it changes, they glide to the top of their column (below).
  const workingKey = useMemo(() => working.map((w) => w.cardId).sort().join(), [working]);

  const flipCommit = useMemo(() => ({ cards, liftKey, workingKey }), [cards, liftKey, workingKey]);
  const { ref: rootRef, snapshot: snapshotCards } = useCardFlip<HTMLDivElement>(flipCommit);

  /*
   * JAVA-45 (user report, 2026-09-24: "it loads everything at once, and flickers"). The board used
   * to re-download every card -- and the meta, the lanes and the whole timesheet -- on every live
   * event, and the edge cuts the live stream every minute, so an idle board reloaded itself every
   * minute. Now it keeps a copy (`local-store/board-store.ts`, in IndexedDB since JAVA-1575) and the
   * server instant it is good as of: the first visit loads in full, and from then on it asks only
   * for what changed since. Only this catch-up writes the cards, so the refs are always what is on screen.
   */
  const cardsRef = useRef<BoardCard[] | null>(null);
  const asOf = useRef<string | null>(null);
  // Where the copy is kept, when it is kept at all: an account's copy, in a repository that keeps one.
  const keptBy = repository.persistent && copy.accountId ? copy.accountId : null;

  /** Catches the cards up. True when any changed. */
  const syncCards = useCallback(async (): Promise<boolean> => {
    const since = asOf.current;
    const changes = await repository.listChanges(projectId, since ?? undefined);
    const next = since === null ? changes.cards : mergeChanges(cardsRef.current ?? [], changes);
    asOf.current = changes.asOf;
    if (next === cardsRef.current) return false;
    // Where every card is right now, taken in the same tick the new positions are set: the cards
    // this change moves glide from here (`use-card-flip.ts`).
    snapshotCards();
    cardsRef.current = next;
    setCards(next);
    if (keptBy) void writeBoardCards(keptBy, projectId, { asOf: changes.asOf, cards: next }).catch(() => {});
    return true;
  }, [projectId, repository, snapshotCards, keptBy]);

  /*
   * Everything: on opening, on "Try again", and when the project itself changes. Each answer sets
   * its own state when it arrives: the header does not wait for the cards, nor the cards for the
   * lanes (JAVA-1575). The copy is kept once all of them have answered.
   */
  const loadAll = useCallback(async () => {
    const [proj, work] = await Promise.all([
      repository.getProject(projectId).then((answer) => {
        setProject(answer);
        return answer;
      }),
      repository.listWorking(projectId).then((answer) => {
        setWorking(answer);
        return answer;
      }),
      syncCards(),
      loadAround(),
    ]);
    if (keptBy) void writeBoardHeader(keptBy, projectId, { project: proj, working: work }).catch(() => {});
  }, [projectId, repository, syncCards, loadAround, keptBy]);

  /*
   * One catch-up at a time, and one more after it if anything asked meanwhile: a burst of agent
   * writes costs two -- the one running and a last one that sees everything the burst wrote (found
   * by the 2026-09-23 audit, when each event started its own full reload). A card event asks for
   * `cards`; opening the board or a change to the project asks for `all`, which includes it.
   */
  const running = useRef<Promise<void> | null>(null);
  const pending = useRef<"cards" | "all" | null>(null);
  // Nothing runs before the copy has been read: the first catch-up starts from what it holds. An
  // event that comes earlier is covered by that first "all" (see the effect below).
  const copyRead = useRef(false);
  const schedule = useCallback(
    (depth: "cards" | "all"): Promise<void> => {
      if (!copyRead.current) return Promise.resolve();
      if (depth === "all" || pending.current === null) pending.current = depth;
      if (running.current) return running.current;
      const run = async () => {
        while (pending.current) {
          const now = pending.current;
          pending.current = null;
          try {
            if (now === "all") await loadAll();
            else if (await syncCards()) await loadAround();
            setLoadError(null);
          } catch (err) {
            // A project this account can no longer read takes its copy with it.
            if (err instanceof ApiError && (err.status === 403 || err.status === 404)) void forgetBoardStore(projectId).catch(() => {});
            // Offline/API down (JDB-226 acceptance criterion): a dedicated error state, never an
            // empty board pretending there is simply nothing to show.
            setLoadError(err instanceof Error ? err.message : "Couldn't reach the Officium API.");
          }
        }
      };
      running.current = run().finally(() => {
        running.current = null;
      });
      return running.current;
    },
    [loadAll, syncCards, loadAround, projectId],
  );
  const refresh = useCallback(() => schedule("cards"), [schedule]);

  /*
   * The copy paints first, then the network brings it up to date. Nothing is requested while the
   * copy is still being read, so the catch-up always starts from what the copy holds. Once per
   * account and project: a later change of the network's schedule never repaints from the copy.
   * The paint is set in this render (so the first frame already has it); the refs follow in the
   * effect below, before the catch-up starts.
   */
  const settled = copy.state === "ready" || copy.state === "none";
  const [paintedFor, setPaintedFor] = useState<string | null>(null);
  if (settled && paintedFor !== copy.key) {
    setPaintedFor(copy.key);
    setCards(copy.store?.copy?.cards ?? null);
    setProject(copy.store?.header?.project ?? null);
    setWorking(copy.store?.header?.working ?? []);
  }
  const startedFor = useRef<string | null>(null);
  useEffect(() => {
    copyRead.current = settled;
    if (!settled || startedFor.current === copy.key) return;
    startedFor.current = copy.key;
    cardsRef.current = copy.store?.copy?.cards ?? null;
    asOf.current = copy.store?.copy?.asOf ?? null;
    void schedule("all");
  }, [copy, settled, schedule]);

  // Agent work is monitoring (officium-api.md §4.1): it changes on every status line, so it
  // refetches ONLY itself -- `refresh()` re-reads every card's detail, far too much per line.
  const workingKeyRef = useRef(workingKey);
  useEffect(() => {
    workingKeyRef.current = workingKey;
  }, [workingKey]);
  const refreshWorking = useCallback(async () => {
    try {
      const next = await repository.listWorking(projectId);
      // A card that starts or stops being worked moves in its column: record where every card is
      // first, so it glides. Only then -- a snapshot nothing commits would animate a later change.
      if (next.map((w) => w.cardId).sort().join() !== workingKeyRef.current) snapshotCards();
      setWorking(next);
    } catch {
      // A missed status line is not worth an error banner; the next event or refresh recovers it.
    }
  }, [projectId, repository, snapshotCards]);

  return { project, setProject, cards, working, loadError, schedule, refresh, refreshWorking, snapshotCards, rootRef };
}

export type LiveSync = ReturnType<typeof useLiveSync>;
