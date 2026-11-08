"use client";

import { useState } from "react";
import { useTheaterScene } from "@javadaba/ui";

import { Board } from "../backlog/Board";
import { InMemoryBacklogRepository, DEFAULT_PROJECT_ID } from "../../lib/backlog/memory-repository";
import { useBoardAutopilot } from "./use-board-autopilot";

/**
 * The product page's Theater miniapp (`doc://projects/ui/theater-miniapp-contract`): the REAL
 * `Board` -- the same component `/app/p/[projectId]` mounts -- over a fresh
 * `InMemoryBacklogRepository` instance, never the shared singleton `/app` uses
 * (`getSharedBacklogRepository`). No session, no `/api` call, no `localStorage`: the repository
 * is entirely in-memory and this component calls `Board` directly, skipping
 * `ProjectBoardSurface`'s `recordProjectOpened` (the only thing in this tree that touches
 * `localStorage`).
 *
 * One repository per PASS, so every Theater pass starts from the same seed and the autopilot's
 * writes never leak into a real session. When the Theater loops on this scene it does not
 * remount it (miniapp contract §3): `pass` changes, a fresh repository replaces the old one, and
 * `Board` refetches into it -- the cards the agent wrote leave and the seed glides back into
 * place, instead of the frame going blank and the board fading in from nothing.
 */
export function BoardScene() {
  const pass = useTheaterScene()?.pass ?? 0;
  // State adjusted during render, not `useMemo([pass])`: `pass` is a reset signal the constructor
  // never reads, and React Compiler memoises by what the body READS -- it would keep the first
  // repository forever.
  const [current, setCurrent] = useState(() => ({ pass, repository: new InMemoryBacklogRepository() }));
  if (current.pass !== pass) setCurrent({ pass, repository: new InMemoryBacklogRepository() });
  const { repository } = current;
  useBoardAutopilot(repository, DEFAULT_PROJECT_ID);

  return (
    <div className="h-full">
      <Board projectId={DEFAULT_PROJECT_ID} repository={repository} />
    </div>
  );
}
