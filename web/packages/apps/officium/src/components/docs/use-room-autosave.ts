"use client";

import { useEffect, useRef, type RefObject } from "react";

import type { DocRoom } from "../../lib/docs/room/use-doc-room";
import type { Draft } from "./use-doc-autosave";

/**
 * What a page's live room asks of its autosave (JAVA-803): the room as the saves see it, the first
 * save when this client becomes the room's saver, and the title, which lives in the room beside the text.
 */
export function useRoomAutosave({ room, live, change, schedule }: {
  room: Pick<DocRoom, "active" | "saver" | "epoch" | "title">;
  live: RefObject<{ draft: Draft }>;
  change: (next: Draft) => void;
  schedule: (next: Draft) => void;
}): RefObject<Pick<DocRoom, "active" | "saver" | "epoch" | "title">> {
  const now = useRef(room);
  useEffect(() => {
    now.current = room;
  });

  // Becoming the saver (the first one left): what the room holds now is what gets saved.
  useEffect(() => {
    if (room.active && room.saver) schedule(live.current.draft);
  }, [room.active, room.saver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () =>
      room.title?.observe((title) => {
        if (title !== live.current.draft.title) change({ ...live.current.draft, title });
      }),
    [room.title], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return now;
}
