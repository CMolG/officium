"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { BacklogRepository } from "../backlog/repository";
import type { DocStar } from "../backlog/types";
import { moveStar } from "./doc-stars";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

export interface DocStarsValue {
  /** The caller's stars in order; null until the first read. */
  stars: DocStar[] | null;
  error: string | null;
  /** What the last star change did or why it didn't, spoken to screen readers and shown under the list. */
  notice: string | null;
  /** Why the last star change failed, for the control that asked for it; null after the next success. */
  failure: string | null;
  isStarred: (path: string, kind: DocStar["kind"]) => boolean;
  toggle: (path: string, kind: DocStar["kind"]) => Promise<void>;
  /** Moves the star at index `from` to index `to`; a failed write puts the list back and says why. */
  move: (from: number, to: number) => Promise<void>;
  retry: () => void;
  /** Tells the API the caller opened a page, for Recent. Best effort: nobody waits on it. */
  recordView: (path: string) => void;
}

const DocStarsContext = createContext<DocStarsValue | null>(null);

export function useDocStars(): DocStarsValue {
  const value = useContext(DocStarsContext);
  if (!value) throw new Error("useDocStars needs a DocStarsProvider above it");
  return value;
}

/**
 * The caller's stars for one project (JAVA-799), read once and kept in step with the live channel, so the
 * sidebar's list, a page's Star button and a tree row's menu all show the same truth. Stars are personal:
 * any member has them, a viewer too.
 */
export function DocStarsProvider({ projectId, repository, children }: { projectId: string; repository: BacklogRepository; children: ReactNode }) {
  const [stars, setStars] = useState<DocStar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // Writes in flight: a read that lands meanwhile is stale (it would undo an optimistic move), so it is
  // dropped, and the write's end reads again.
  const writing = useRef(0);

  useEffect(() => {
    let cancelled = false;
    repository.listDocStars(projectId).then(
      (next) => {
        if (cancelled || writing.current > 0) return;
        setStars(next);
        setError(null);
      },
      (err) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, tick]);

  // A page that moved, was trashed or came back changes what a star points at: read again.
  useEffect(
    () =>
      repository.subscribe(projectId, (event) => {
        if (event.type === "doc.changed" || event.type === "stream.ready") setTick((n) => n + 1);
      }),
    [projectId, repository],
  );

  const isStarred = useCallback((path: string, kind: DocStar["kind"]) => (stars ?? []).some((star) => star.path === path && star.kind === kind), [stars]);

  const toggle = useCallback(
    async (path: string, kind: DocStar["kind"]) => {
      const was = isStarred(path, kind);
      writing.current += 1;
      try {
        if (was) await repository.unstarDoc(projectId, path, kind);
        else await repository.starDoc(projectId, path, { kind });
        setNotice(was ? `Removed ${path} from Starred.` : `Added ${path} to Starred.`);
        setFailure(null);
      } catch (err) {
        const why = `Couldn't ${was ? "remove" : "add"} the star: ${messageOf(err)}`;
        setNotice(why);
        setFailure(why);
      } finally {
        writing.current -= 1;
        setTick((n) => n + 1);
      }
    },
    [isStarred, projectId, repository],
  );

  const move = useCallback(
    async (from: number, to: number) => {
      const before = stars;
      if (!before || from === to || to < 0 || to >= before.length) return;
      const moved = before[from];
      setStars(moveStar(before, from, to).map((star, position) => ({ ...star, position })));
      writing.current += 1;
      try {
        // The index the person sees: the API counts the listed stars other than the moved one, which is `to`.
        await repository.starDoc(projectId, moved.path, { kind: moved.kind, position: to });
        setNotice(`Moved ${moved.name} to ${to + 1} of ${before.length}.`);
        setFailure(null);
      } catch (err) {
        setStars(before);
        const why = `Couldn't move ${moved.name}: ${messageOf(err)}`;
        setNotice(why);
        setFailure(why);
      } finally {
        writing.current -= 1;
        setTick((n) => n + 1);
      }
    },
    [stars, projectId, repository],
  );

  const retry = useCallback(() => setTick((n) => n + 1), []);

  const recordView = useCallback(
    (path: string) => {
      // Recent is a convenience: a view that fails to record must never get in the way of reading.
      repository.recordDocView(projectId, path).catch(() => undefined);
    },
    [projectId, repository],
  );

  const value = useMemo<DocStarsValue>(
    () => ({ stars, error, notice, failure, isStarred, toggle, move, retry, recordView }),
    [stars, error, notice, failure, isStarred, toggle, move, retry, recordView],
  );
  return (
    <DocStarsContext.Provider value={value}>
      {children}
      {/* The only status region for star changes, always mounted: the list's own line is silent when the sidebar is folded. */}
      <p role="status" aria-live="polite" className="sr-only">
        {notice}
      </p>
    </DocStarsContext.Provider>
  );
}
