"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@javadaba/ui";

import { DocCommentComposer } from "./DocCommentComposer";
import { DocThreadCard } from "./DocThreadCard";
import type { Commenting } from "./use-commenting";
import type { Passages } from "./use-passages";

/** How long a peeked popover waits once the pointer leaves its passage, so the pointer can travel into it. */
const LEAVE_MS = 250;

/**
 * A commented passage's popover (JAVA-1538): hovering the underlined words shows their thread; a click on them, or a
 * press inside the popover, pins it open to reply or resolve; Escape or a press outside closes it. A selection's
 * Comment opens it pinned on a composer. Touch has no hover: a tap pins it. It portals out of the scrolling text
 * (layout floor L1) and points at the passage wherever the text has scrolled.
 */
export function DocCommentPopover({ projectId, commenting, passages, body }: {
  projectId: string;
  commenting: Commenting;
  passages: Passages;
  /** The text the passages are in: where the pointer is watched. */
  body: RefObject<HTMLElement | null>;
}) {
  const { passage, peek, unpeek, pin, closePassage, composing, stopComposing, comments } = commenting;
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stay = useCallback(() => {
    if (leaving.current) clearTimeout(leaving.current);
    leaving.current = null;
  }, []);
  const leave = useCallback(() => {
    stay();
    leaving.current = setTimeout(unpeek, LEAVE_MS);
  }, [stay, unpeek]);

  const threadId = passage?.threadId ?? null;
  const thread = threadId === null ? null : (comments.threads.find((t) => t.id === threadId) ?? null);
  const { rectOf } = passages;
  const anchor = useMemo(() => ({ current: { getBoundingClientRect: () => rectOf(threadId) ?? new DOMRect() } }), [rectOf, threadId]);
  // A thread resolved, or whose words left the page, has no passage to point at any more: the end section lists it.
  const onPassage = thread !== null && !thread.resolvedAt && (passages.anchored?.includes(thread.id) ?? true);
  const shown = passage !== null && (threadId === null ? composing !== null : onPassage);

  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const id = passages.hitAt(event);
      if (!id) return leave();
      stay();
      // A pinned popover that can no longer be shown does not hold the next passage back.
      if (passage?.pinned && !shown) closePassage();
      peek(id);
    };
    // A click on a passage leaves the caret in the text, whose editor keeps Escape from the popover's own handler.
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && passage) closePassage();
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("keydown", key);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("keydown", key);
      stay();
    };
  }, [body, passages, peek, leave, stay, passage, shown, closePassage]);

  return (
    <Popover open={shown} onOpenChange={(open) => !open && closePassage()}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        side="bottom"
        align="start"
        className="flex max-h-96 w-80 flex-col gap-2 overflow-y-auto p-2"
        data-testid="doc-comment-popover"
        data-pinned={passage?.pinned ?? false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        // A press on a commented passage is not "outside": its click pins the popover instead of closing it.
        onPointerDownOutside={(event) => passages.hitAt(event.detail.originalEvent) && event.preventDefault()}
        onPointerEnter={stay}
        onPointerLeave={() => !passage?.pinned && leave()}
        onPointerDownCapture={pin}
      >
        {thread && (
          <DocThreadCard
            projectId={projectId}
            thread={thread}
            me={commenting.me}
            canWrite={commenting.canWrite}
            owner={commenting.owner}
            actions={comments.actions}
            anchored
            focused={false}
          />
        )}
        {threadId === null && composing && (
          <DocCommentComposer
            projectId={projectId}
            label="New comment"
            placeholder="Write a comment…"
            quote={composing}
            autoFocus
            onCancel={stopComposing}
            onSubmit={async (text) => {
              const failed = await comments.actions.add({ text, quote: composing });
              if (!failed) stopComposing();
              return failed;
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
