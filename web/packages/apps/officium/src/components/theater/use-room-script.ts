"use client";

import { useState } from "react";
import { useTheaterScene } from "@javadaba/ui";

import { DEFAULT_PROJECT_ID, InMemoryBacklogRepository } from "../../lib/backlog/memory-repository";
import type { StorageUsage } from "../../lib/backlog/storage-usage";
import { ROOM_STEPS, type RoomContext } from "./room-script";
import { useSceneSteps } from "./use-scene-steps";

export interface RoomView {
  /** How many of the four people are on screen. */
  seats: number;
  /** Cards written so far. */
  cards: number;
  /** Percent of the width showing the Linear half. The handle starts in the middle. */
  position: number;
  /** The reader has dragged the handle, so the script stops taking it back. */
  moved: boolean;
  usage: StorageUsage;
}

export interface RoomScript extends RoomView {
  /** The reader moved the handle. */
  setPosition: (position: number) => void;
}

const EMPTY_USAGE: StorageUsage = {
  usedBytes: 0,
  limitBytes: 15_000_000,
  freeBytes: 15_000_000,
  sharedBytes: 0,
  sharedAvailableBytes: 0,
  otherApps: [],
};

const START: RoomView = { seats: 0, cards: 0, position: 50, moved: false, usage: EMPTY_USAGE };

/**
 * The room scene's state and its script. A fresh in-memory repository per pass of the Theater, as
 * the board does, so the cards the script writes never leak into a real session. Nothing here is
 * stored: the scene is a demo and it starts over on every pass.
 */
export function useRoomScript(): RoomScript {
  const pass = useTheaterScene()?.pass ?? 0;
  const [current, setCurrent] = useState(() => ({
    pass,
    repository: new InMemoryBacklogRepository(),
    view: START,
  }));
  if (current.pass !== pass) {
    setCurrent({ pass, repository: new InMemoryBacklogRepository(), view: START });
  }
  const { repository, view } = current;

  // A step from an earlier pass may still be finishing: it only writes into the pass it belongs to.
  const patch = (owner: InMemoryBacklogRepository, change: Partial<RoomView>) =>
    setCurrent((prev) => (prev.repository === owner ? { ...prev, view: { ...prev.view, ...change } } : prev));

  useSceneSteps(
    ROOM_STEPS,
    (): RoomContext => ({
      repository,
      projectId: DEFAULT_PROJECT_ID,
      setSeats: (seats) => patch(repository, { seats }),
      setCards: (cards) => patch(repository, { cards }),
      handOff: () =>
        setCurrent((prev) =>
          prev.repository === repository && !prev.view.moved
            ? { ...prev, view: { ...prev.view, position: 0 } }
            : prev,
        ),
      setUsage: (usage) => patch(repository, { usage }),
    }),
    repository,
  );

  return {
    ...view,
    setPosition: (position) => patch(repository, { position, moved: true }),
  };
}
