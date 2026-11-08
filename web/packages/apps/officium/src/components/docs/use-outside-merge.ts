"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { PageEditorHandle } from "@javadaba/rich-text";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocPage } from "../../lib/backlog/types";
import { merge3 } from "../../lib/docs/merge3";
import type { DocRoom } from "../../lib/docs/room/use-doc-room";
import { actorName } from "./DocConflictPanel";
import type { Draft } from "./use-doc-autosave";

/** The one notice a merge leaves in every editor (JAVA-1477): who wrote, and whether lines overlapped. */
export interface MergeNotice {
  by: string;
  version: number;
  overlaps: number;
}

type Saved = { version: number; title: string; body: string };

/**
 * The saver's side of ADR 0024 § Saving rule 4: a write that reaches the page from outside the room
 * (an agent, a stale client, the room on the other instance) is merged INTO the room, never
 * reseeded over it. Ours is what the editor holds now, base the text this client last saved or
 * adopted, theirs the outside text. The result goes in as one `setMarkdown`, and the next save
 * carries the outside version as `expectedVersion`, so a lost race repeats the merge.
 */
export function useOutsideMerge({ repository, projectId, path, room, baseRef, live, editor, show, schedule }: {
  repository: BacklogRepository;
  projectId: string;
  path: string;
  room: Pick<DocRoom, "active" | "saver" | "title" | "frames" | "epoch" | "live" | "staleHandler">;
  baseRef: RefObject<Saved>;
  live: RefObject<{ draft: Draft; unsaved: boolean }>;
  editor: RefObject<PageEditorHandle | null>;
  show: (next: Draft) => void;
  schedule: (next: Draft) => void;
}) {
  const [notice, setNotice] = useState<MergeNotice | null>(null);
  const now = useRef(room);
  const { staleHandler: staleHandlerRef } = room;
  useEffect(() => {
    now.current = room;
  });

  /** Merges `theirs` into the room's text; `from` is the base to merge against (null when unknown). */
  const applyMerge = useCallback(
    (from: string | null, theirs: { body: string; by: string; version: number | null; title?: string; fromTitle?: string }) => {
      const ours = live.current.draft;
      const { merged, overlaps: bodyOverlaps } = merge3(from, ours.body, theirs.body);
      // The title merges like a one-line hunk: only theirs changed, take it; both changed, ours stays.
      const titleChanged = theirs.title !== undefined && theirs.title !== theirs.fromTitle;
      const takeTitle = titleChanged && ours.title === theirs.fromTitle && theirs.title !== ours.title;
      const title = takeTitle ? (theirs.title as string) : ours.title;
      const overlaps = bodyOverlaps + (titleChanged && !takeTitle && ours.title !== theirs.title ? 1 : 0);
      const changed = merged !== ours.body || takeTitle;
      if (takeTitle) now.current.title?.set(title);
      if (merged !== ours.body) editor.current?.setMarkdown(merged);
      if (changed) show({ title, body: merged });
      schedule({ title, body: merged });
      if (changed || overlaps > 0) {
        const told = { by: theirs.by, version: theirs.version ?? baseRef.current.version, overlaps };
        setNotice(told);
        now.current.frames?.send({ type: "merged", ...told });
      }
    },
    [baseRef, editor, live, schedule, show],
  );

  /** A newer page version this client did not save. */
  const absorb = useCallback(
    (theirs: DocPage) => {
      const { body: from, title: fromTitle } = baseRef.current;
      baseRef.current = { version: theirs.version, title: theirs.title, body: theirs.body };
      applyMerge(from, { body: theirs.body, by: actorName(theirs.updatedBy), version: theirs.version, title: theirs.title, fromTitle });
    },
    [applyMerge, baseRef],
  );

  const baseBody = useCallback(
    async (version: number | null): Promise<string | null> => {
      if (version === null) return null;
      if (version === baseRef.current.version) return baseRef.current.body;
      try {
        const history = await repository.getDocHistory(projectId, path);
        return history.revisions.find((r) => r.version === version)?.body ?? (history.current.version === version ? history.current.body : null);
      } catch {
        return null;
      }
    },
    [baseRef, path, projectId, repository],
  );

  // What the relay forwards: a notice for everyone, or a stale client's text for the saver.
  useEffect(
    () =>
      room.frames?.listen((frame) => {
        if (frame.type === "merged") setNotice({ by: frame.by, version: frame.version, overlaps: frame.overlaps });
        else if (now.current.saver) void baseBody(frame.base).then((from) => applyMerge(from, { body: frame.markdown, by: "Another editor", version: null }));
      }),
    [room.frames, applyMerge, baseBody],
  );

  // A client of a dead room keeps its unsaved text and the version it started from, and hands both to the new room.
  const kept = useRef<{ base: number; markdown: string } | null>(null);
  useEffect(() => {
    staleHandlerRef.current = () => {
      if (live.current.unsaved || live.current.draft.body !== baseRef.current.body) kept.current = { base: baseRef.current.version, markdown: live.current.draft.body };
    };
  });
  useEffect(() => {
    const text = kept.current;
    if (!text || !room.live || !room.epoch) return;
    kept.current = null;
    if (now.current.saver) void baseBody(text.base).then((from) => applyMerge(from, { body: text.markdown, by: "Another editor", version: null }));
    else room.frames?.send({ type: "outside", base: text.base, markdown: text.markdown });
  }, [room.live, room.epoch, room.frames, applyMerge, baseBody]);

  return { notice, absorb, dismiss: () => setNotice(null) };
}
