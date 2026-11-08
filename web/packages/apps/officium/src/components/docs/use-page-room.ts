"use client";

import { useEffect, useState, type RefObject } from "react";
import { keepsMarkdown, type PageEditorHandle } from "@javadaba/rich-text";

import { USES_MEMORY_BACKEND } from "../../lib/backlog/get-repository";
import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocPage, Member } from "../../lib/backlog/types";
import { useCurrentAccountId } from "../../lib/backlog/use-current-account";
import { presenceTint } from "../../lib/docs/presence/presence-tint";
import { useDocRoom, type DocRoom } from "../../lib/docs/room/use-doc-room";
import { useRoomFollow } from "../../lib/docs/room/use-room-follow";
import type { Draft } from "./use-doc-autosave";
import { IS_LOCAL } from "../../lib/edition";

/**
 * The room of the page being edited (JAVA-803), once the project's members are known (the caret
 * carries the person's name). A page the visual editor can't keep exactly is edited alone, as Markdown.
 */
export function usePageRoom({ repository, projectId, page, observer = false }: {
  repository: BacklogRepository;
  projectId: string;
  page: DocPage;
  /** A viewer follows the room without a caret of their own, so they need no name. */
  observer?: boolean;
}) {
  const me = useCurrentAccountId();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [lossless] = useState(() => keepsMarkdown(page.body));
  useEffect(() => {
    let cancelled = false;
    repository.listMembers(projectId).then(
      (list) => !cancelled && setMembers(list),
      () => !cancelled && setMembers([]),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository]);
  const room = useDocRoom({
    enabled: !USES_MEMORY_BACKEND && !IS_LOCAL && Boolean(me) && (observer || members !== null) && !page.builtin && lossless && !page.archivedAt,
    projectId,
    pageId: page.id,
    name: members?.find((m) => m.accountId === me)?.name ?? "Someone",
    color: presenceTint(me ?? ""),
    accountId: me ?? "",
  });
  useRoomFollow(room.collaboration?.awareness ?? null);
  const collaborative = !USES_MEMORY_BACKEND && !IS_LOCAL && lossless;
  // The editor waits for who is here (the caret carries a name) and then for the room, so it mounts once.
  return { room, members, collaborative, joining: collaborative && !observer && members === null };
}

/** The room asked this client to seed it: the page's text goes in once, and the server hears it is done. */
export function useRoomSeed({ room, editorReady, editor, draft }: {
  room: DocRoom;
  editorReady: boolean;
  editor: RefObject<PageEditorHandle | null>;
  /** The text as the page last stood: what the room is seeded with. */
  draft: Draft;
}) {
  useEffect(() => {
    if (!room.seed || !editorReady) return;
    room.title?.set(draft.title);
    editor.current?.setMarkdown(draft.body);
    room.seeded();
  }, [room.seed, editorReady]); // eslint-disable-line react-hooks/exhaustive-deps
}
