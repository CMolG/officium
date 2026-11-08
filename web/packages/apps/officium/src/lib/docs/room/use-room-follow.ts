"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@javadaba/sdk/platform";
import type { Awareness } from "y-protocols/awareness";

import { setFollowable, stopFollowing, useFollowing } from "./follow-store";

interface PersonState {
  user?: { accountId?: string };
  viewport?: number;
}

/** The first top-level block that reaches the top of the screen: where this person is reading. */
function topBlock(root: Element): number {
  const blocks = Array.from(root.children);
  const at = blocks.findIndex((block) => block.getBoundingClientRect().bottom > 0);
  return Math.max(at, 0);
}

function onScreen(element: Element): boolean {
  const { top, bottom } = element.getBoundingClientRect();
  return top >= 64 && bottom <= window.innerHeight - 64;
}

/**
 * Observer mode (JAVA-803): says where this person is reading, tells the avatars who can be followed,
 * and while someone is followed keeps their caret -- or, with none, their viewport -- on screen until the
 * person scrolls, types, clicks or presses Esc. A programmatic scroll is not any of those, so it never
 * ends the follow by itself.
 */
export function useRoomFollow(awareness: Awareness | null): void {
  const following = useFollowing();

  useEffect(() => {
    if (!awareness) return;
    const refresh = () => {
      const ids = new Set<string>();
      awareness.getStates().forEach((state, client) => {
        const id = (state as PersonState).user?.accountId;
        if (id && client !== awareness.clientID) ids.add(id);
      });
      setFollowable(ids);
    };
    awareness.on("change", refresh);
    refresh();
    return () => {
      awareness.off("change", refresh);
      setFollowable(new Set());
      stopFollowing();
    };
  }, [awareness]);

  useEffect(() => {
    if (!awareness) return;
    let frame = 0;
    const publish = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.querySelector(".jd-page-editor");
        if (root) awareness.setLocalStateField("viewport", topBlock(root));
      });
    };
    window.addEventListener("scroll", publish, { capture: true, passive: true });
    publish();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", publish, true);
    };
  }, [awareness]);

  useEffect(() => {
    if (!awareness || !following) return;
    let frame = 0;
    const locate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const behavior = prefersReducedMotion() ? "auto" : "smooth";
        const caret = document.querySelector(`.jd-collab-caret[data-account="${following.accountId}"]`);
        if (caret) {
          if (!onScreen(caret)) caret.scrollIntoView({ block: "center", behavior });
          return;
        }
        const state = [...awareness.getStates().values()].find(
          (s) => (s as PersonState).user?.accountId === following.accountId,
        ) as PersonState | undefined;
        const block = document.querySelector(".jd-page-editor")?.children[state?.viewport ?? -1];
        if (block && !onScreen(block)) block.scrollIntoView({ block: "start", behavior });
      });
    };
    const stop = () => stopFollowing();
    const ends = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
    ends.forEach((type) => window.addEventListener(type, stop, { capture: true, passive: true }));
    awareness.on("change", locate);
    locate();
    return () => {
      cancelAnimationFrame(frame);
      awareness.off("change", locate);
      ends.forEach((type) => window.removeEventListener(type, stop, true));
    };
  }, [awareness, following]);
}
