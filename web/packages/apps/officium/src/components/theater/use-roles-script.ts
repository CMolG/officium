"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheaterScene } from "@javadaba/ui";

import { DEFAULT_PROJECT_ID, InMemoryBacklogRepository } from "../../lib/backlog/memory-repository";
import { runLabel } from "../../lib/backlog/role-matrix";
import type { Card } from "../../lib/backlog/types";
import { applyProfile } from "./roles-profile";
import { PROFILE_DEFAULTS, PROFILE_ECO, ROLES_CARDS, ROLES_STEP_MS } from "./roles-script";
import { useSceneSteps, type SceneStep } from "./use-scene-steps";

interface RolesCtx {
  repository: InMemoryBacklogRepository;
  projectId: string;
}

/** Passes on which a viewer chose a profile (the cursor's click counts): the script never overwrites that choice. */
const chosen = new WeakSet<InMemoryBacklogRepository>();

const STEPS: readonly SceneStep<RolesCtx>[] = [
  // Applies Eco only when nobody has chosen one yet on this pass. Reduced motion plays no cursor,
  // so this is what puts the end state on screen.
  {
    at: ROLES_STEP_MS.ensure,
    run: async ({ repository, projectId }) => {
      if (chosen.has(repository)) return;
      await applyProfile(repository, projectId, PROFILE_ECO);
    },
  },
  // The agent picks up the to-do card: to do to in progress. Its Sonnet line stays.
  {
    at: ROLES_STEP_MS.pickUp,
    run: async ({ repository, projectId }) => {
      const card = await repository.getCard(projectId, "OFF-102");
      if (card.status !== "todo") return;
      await repository.moveCard(projectId, card.id, { expectedVersion: card.version, status: "doing", position: 0 });
    },
  },
];

/** The six cards as they read. The matrix is read first: it is what the cards' AI and effort come from, and a failed read of it ends the loading. */
async function readCards(repository: InMemoryBacklogRepository): Promise<Card[]> {
  await repository.getRoleMatrix(DEFAULT_PROJECT_ID);
  return Promise.all(ROLES_CARDS.map((key) => repository.getCard(DEFAULT_PROJECT_ID, key)));
}

async function readBaseline(): Promise<Record<string, string>> {
  const cards = await readCards(new InMemoryBacklogRepository());
  return Object.fromEntries(cards.map((card) => [card.key, card.runConfig ? runLabel(card.runConfig) : ""]));
}

interface Loaded {
  repository: InMemoryBacklogRepository;
  cards: Card[] | null;
  baseline: Record<string, string> | null;
  error: string | null;
}

/**
 * The work-profile scene's state. One repository per PASS, so every pass starts from the same
 * seed and the script's writes never reach a real session (the same rule `board-scene.tsx`
 * keeps). The profiles client is not used: its state is shared across passes.
 */
export function useRolesScript() {
  const pass = useTheaterScene()?.pass ?? 0;
  // State adjusted during render, not memoised: React Compiler would keep the first repository
  // forever (see `board-scene.tsx`).
  const [current, setCurrent] = useState(() => ({ pass, repository: new InMemoryBacklogRepository() }));
  if (current.pass !== pass) setCurrent({ pass, repository: new InMemoryBacklogRepository() });
  const { repository } = current;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [picked, setPicked] = useState<{ repository: InMemoryBacklogRepository; value: string }>({
    repository,
    value: PROFILE_DEFAULTS,
  });
  const mine = loaded?.repository === repository ? loaded : null;
  const choice = picked.repository === repository ? picked.value : PROFILE_DEFAULTS;

  const reload = useCallback(async () => {
    try {
      const [cards, baseline] = await Promise.all([readCards(repository), readBaseline()]);
      setLoaded({ repository, cards, baseline, error: null });
    } catch (err) {
      const error = err instanceof Error && err.message ? err.message : "Couldn't read the project's cards.";
      setLoaded({ repository, cards: null, baseline: null, error });
    }
  }, [repository]);

  useEffect(() => {
    // The first read happens a microtask later, like an event's would: not inside the effect's body.
    queueMicrotask(() => void reload());
    return repository.subscribe(DEFAULT_PROJECT_ID, () => void reload());
  }, [repository, reload]);

  const makeCtx = useCallback(() => ({ repository, projectId: DEFAULT_PROJECT_ID }), [repository]);
  useSceneSteps(STEPS, makeCtx, repository);

  const apply = useCallback(
    async (value: string) => {
      chosen.add(repository);
      await applyProfile(repository, DEFAULT_PROJECT_ID, value);
      await reload();
    },
    [repository, reload],
  );

  const setChoice = useCallback((value: string) => setPicked({ repository, value }), [repository]);

  return {
    cards: mine?.cards ?? null,
    baseline: mine?.baseline ?? null,
    error: mine?.error ?? null,
    choice,
    setChoice,
    apply: () => apply(choice),
    reload,
  };
}
