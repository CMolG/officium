"use client";

import type { ComponentProps } from "react";
import { PageEditor } from "@javadaba/rich-text";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { DocFollowBar } from "./DocFollowBar";
import { DocReadingView } from "./DocReadingView";
import { usePageRoom } from "./use-page-room";

type ReadingProps = Omit<ComponentProps<typeof DocReadingView>, "titleSlot" | "bodySlot">;

const NOOP = () => {};

/**
 * A page someone can read but not change (JAVA-803). While others edit it, the page follows their room
 * and shows what they are writing; the person can follow a caret but cannot change a word. With no room
 * -- no one editing, no socket, a page in source or read mode -- it is the page as saved.
 */
export function DocPageObserving({ reading, repository }: { reading: ReadingProps; repository: BacklogRepository }) {
  const { projectId, page } = reading;
  const { room } = usePageRoom({ repository, projectId, page, observer: true });
  if (!room.live || !room.collaboration) return <DocReadingView {...reading} />;
  return (
    <DocReadingView
      {...reading}
      bodySlot={
        <>
          <DocFollowBar />
          <PageEditor
            value=""
            onChange={NOOP}
            label="Page text"
            readOnly
            collaboration={room.collaboration}
            resolveImage={reading.files?.resolve}
            status={<span data-testid="doc-room-status" className="text-xs text-[color:var(--jd-muted)]">Live · read only</span>}
            className="min-w-0 flex-1"
          />
        </>
      }
    />
  );
}
