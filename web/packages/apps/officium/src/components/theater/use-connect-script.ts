"use client";

import { useState } from "react";
import { useTheaterScene } from "@javadaba/ui";

import { InMemoryBacklogRepository } from "../../lib/backlog/memory-repository";
import { CONNECT_STEPS, type ConnectContext } from "./connect-script";
import { useSceneSteps } from "./use-scene-steps";

export interface ConnectView {
  /** How many of the clients are on screen. */
  clients: number;
  /** Percent of the width showing the Linear half. The handle starts in the middle. */
  position: number;
  /** The reader has dragged the handle, so the script stops taking it back. */
  moved: boolean;
  signedIn: boolean;
  projects: readonly string[];
}

export interface ConnectScript extends ConnectView {
  /** The reader moved the handle. */
  setPosition: (position: number) => void;
}

const START: ConnectView = { clients: 0, position: 50, moved: false, signedIn: false, projects: [] };

/**
 * The connect scene's state and its script. A fresh in-memory repository per pass of the Theater,
 * as the room scene does, so the projects the script adds never leak into a real session. Nothing
 * here is stored: the scene is a demo and it starts over on every pass.
 */
export function useConnectScript(): ConnectScript {
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
  const patch = (owner: InMemoryBacklogRepository, change: Partial<ConnectView>) =>
    setCurrent((prev) => (prev.repository === owner ? { ...prev, view: { ...prev.view, ...change } } : prev));

  useSceneSteps(
    CONNECT_STEPS,
    (): ConnectContext => ({
      repository,
      setClients: (clients) => patch(repository, { clients }),
      handOff: () =>
        setCurrent((prev) =>
          prev.repository === repository && !prev.view.moved
            ? { ...prev, view: { ...prev.view, position: 0 } }
            : prev,
        ),
      setSignedIn: () => patch(repository, { signedIn: true }),
      setProjects: (projects) => patch(repository, { projects }),
    }),
    repository,
  );

  return {
    ...view,
    setPosition: (position) => patch(repository, { position, moved: true }),
  };
}
