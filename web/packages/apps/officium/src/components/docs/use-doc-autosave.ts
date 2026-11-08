"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { MarkdownChange, PageEditorHandle } from "@javadaba/rich-text";
import { useAutosave, type AutosaveFailure } from "@javadaba/ui/hooks";

import { ApiError } from "../../lib/backlog/api-error";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type DocPage } from "../../lib/backlog/types";
import type { DocRoom } from "../../lib/docs/room/use-doc-room";
import { isRoomSave } from "../../lib/docs/room/room-save";
import { stashDraft, takeDraft } from "../../lib/docs/unsaved-drafts";
import type { Conflict } from "./DocConflictPanel";
import { useKeepUnsaved } from "./use-keep-unsaved";
import { useOutsideMerge } from "./use-outside-merge";
import { useRoomAutosave } from "./use-room-autosave";

export interface Draft {
  title: string;
  body: string;
}

/** A save another writer won: the conflict panel takes over, and nothing retries by itself. */
class ConflictError extends Error {}

/** A request that never reached the server retries by itself; anything the server answered waits for the person. */
const classify = (error: unknown): AutosaveFailure =>
  error instanceof TypeError || (error instanceof ApiError && error.status === 0) ? "retry" : "stop";

const newSession = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * A page edited in place, saved as the person types (JAVA-796): 1.5 s after the last change, with
 * the version it last saved and one `editSession` per visit, so the history keeps one version per
 * checkpoint instead of one per pause.
 *
 * - **Its own echo is skipped.** A save's `doc.changed` makes the page read itself again; a page at
 *   the version this hook saved is not new.
 * - **Someone else's write** replaces a clean editor in place; over unsaved edits it is only said,
 *   and the next save answers the conflict.
 * - **Leaving keeps what is not saved.** A pending change saves at once; one that failed is kept
 *   in memory and comes back when the page opens again (`unsaved-drafts.ts`). Closing or reloading
 *   meanwhile gets the browser's prompt.
 */
export function useDocAutosave({ projectId, page, repository, editor, onSaved, room }: {
  projectId: string;
  page: DocPage;
  repository: BacklogRepository;
  /** The editor's handle: a newer saved text goes in through it. */
  editor: RefObject<PageEditorHandle | null>;
  onSaved: (page: DocPage) => void;
  /**
   * The page's live room, when it has one (JAVA-803): only its saver writes, under the room's epoch as
   * the `editSession`; everyone else's changes travel through the room and are saved by the saver.
   */
  room: Pick<DocRoom, "active" | "saver" | "epoch" | "title" | "frames" | "live" | "staleHandler">;
}) {
  const [session] = useState(newSession);
  const [restored] = useState(() => takeDraft(projectId, page.path));
  const base = useRef({ version: page.version, title: page.title, body: page.body });
  const [draft, setDraft] = useState<Draft>(() => restored ?? { title: page.title, body: page.body });
  const [opened, setOpened] = useState({ key: 0, body: draft.body });
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [reference, setReference] = useState<Draft | null>(null);
  const [overtaken, setOvertaken] = useState<DocPage | null>(null);
  const live = useRef({ mounted: true, draft, unsaved: false, status: "idle" });

  const save = async (next: Draft) => {
    const title = next.title.trim();
    const patch: { title?: string; body?: string } = {};
    if (title && title !== base.current.title) patch.title = title;
    if (next.body !== base.current.body) patch.body = next.body;
    if (patch.title === undefined && patch.body === undefined) return;
    try {
      const result = await repository.upsertDoc(projectId, page.path, { ...patch, expectedVersion: base.current.version, editSession: roomNow.current.active && roomNow.current.epoch ? roomNow.current.epoch : session });
      if (isConflict(result) && roomNow.current.active && roomNow.current.saver) {
        // A write from outside the room won the race: it merges into the room, and the next save carries it.
        absorb(result.current);
        return;
      }
      if (isConflict(result)) {
        setConflict({ theirs: result.current, mine: { title: title || base.current.title, body: next.body } });
        throw new ConflictError("Someone else saved this page first.");
      }
      base.current = { version: result.version, title: result.title, body: result.body };
      setOvertaken(null);
      onSaved(result);
    } catch (error) {
      if (!live.current.mounted) stashDraft({ projectId, path: page.path, ...next });
      throw error;
    }
  };

  const autosave = useAutosave<Draft>({ save, delay: 1_500, classify, enabled: !room.active || room.saver });
  useEffect(() => {
    live.current.unsaved = autosave.unsaved;
    live.current.status = autosave.status;
  }, [autosave.unsaved, autosave.status]);

  const show = (next: Draft) => {
    live.current.draft = next;
    setDraft(next);
  };
  // What the room echoes back (the seed, a collaborator's text this saver already saved) is not a change to save.
  const scheduleIfChanged = (next: Draft) => {
    if (live.current.unsaved || next.body !== base.current.body || next.title !== base.current.title) autosave.schedule(next);
  };
  const change = (next: Draft) => {
    show(next);
    if (!roomNow.current.active || roomNow.current.saver) scheduleIfChanged(next);
  };
  const roomNow = useRoomAutosave({ room, live, change, schedule: scheduleIfChanged });
  const outside = useOutsideMerge({ repository, projectId, path: page.path, room, baseRef: base, live, editor, show, schedule: scheduleIfChanged });
  const { absorb } = outside;

  /** Back to someone else's version: the editor reopens with it, and the person's own change is dropped. */
  const reopenWith = (theirs: DocPage, keep: Draft | null) => {
    base.current = { version: theirs.version, title: theirs.title, body: theirs.body };
    autosave.discard();
    show({ title: theirs.title, body: theirs.body });
    // A room keeps its editor: the person's choice is written into it, and the others see it like any edit.
    if (roomNow.current.active) editor.current?.setMarkdown(theirs.body);
    else setOpened((o) => ({ key: o.key + 1, body: theirs.body }));
    setReference(keep);
    setConflict(null);
    setOvertaken(null);
  };

  const { schedule, flush } = autosave;
  useEffect(() => {
    if (restored) schedule(restored);
  }, [restored, schedule]);

  useEffect(() => {
    if (page.version <= base.current.version) return;
    const adopt = { version: page.version, title: page.title, body: page.body };
    const inRoom = roomNow.current.active;
    // In a room a write from outside it (an agent, an old tab, the other instance's room) is the saver's to
    // merge into the room (JAVA-1477); what the room itself saved is already in the editor, so it merges to nothing.
    if (inRoom && roomNow.current.saver) {
      absorb(page);
      return;
    }
    // A member that is not the saver adopts the room's own saves as its base, so a handoff merges against the last
    // room save and not against the version it opened; a write from outside waits for the room's next save.
    if (inRoom) {
      if (isRoomSave(page)) base.current = adopt;
      return;
    }
    if (live.current.unsaved) {
      setOvertaken(page);
      return;
    }
    base.current = adopt;
    // Before the editor exists (it waits for its room) the text it will open with is what moves.
    if (editor.current) editor.current.setMarkdown(page.body);
    else setOpened((o) => ({ ...o, body: page.body }));
    show({ title: page.title, body: page.body });
  }, [page, editor, roomNow, absorb]);

  useKeepUnsaved(projectId, page.path, live);

  return {
    autosave,
    draft,
    editorKey: opened.key,
    initialBody: opened.body,
    restored: restored !== null,
    conflict,
    reference,
    overtaken,
    notice: outside.notice,
    dismissNotice: outside.dismiss,
    setTitle: (title: string) => (room.title ? room.title.set(title) : change({ ...live.current.draft, title })),
    setBody: (body: MarkdownChange) => change({ ...live.current.draft, body: body.markdown }),
    saveNow: () => void flush(),
    keepMine: () => {
      if (!conflict) return;
      base.current = { version: conflict.theirs.version, title: conflict.theirs.title, body: conflict.theirs.body };
      setConflict(null);
      void autosave.retry();
    },
    useTheirs: () => conflict && reopenWith(conflict.theirs, null),
    merge: () => conflict && reopenWith(conflict.theirs, conflict.mine),
  };
}
