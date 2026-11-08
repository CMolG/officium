"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useTheaterScene } from "@javadaba/ui";

import type { InMemoryBacklogRepository } from "../../lib/backlog/memory-repository";
import type { Actor, CardDetail } from "../../lib/backlog/types";
import { END_OF_COLUMN } from "../backlog/task-modal/use-card-writes";
import { PLAN_CARD_DESCRIPTION, PLAN_CARD_TITLE, PLAN_TEXT, PLAN_WORKFLOW } from "./plan-script";

/**
 * PLAN AUTOPILOT -- ONLY for the landing's plan scene (`plan-scene.tsx`). The agent's half of the
 * script: it creates the card in Refine, writes the plan, and moves the card once the person has
 * had their try. The person's half is `PLAN_CURSOR` in `plan-script.ts`.
 *
 * Like `use-board-autopilot.ts`, both halves run on the SCENE's clock, so hovering the Theater
 * freezes the agent and the cursor together. Every step tolerates the person having got there
 * first: a demo that breaks when touched is worse than no demo.
 */

const AGENT: Actor = { kind: "agent", accountId: "acc-demo-plan", name: "Claude Code", agentName: "claude-code" };

/** The scene's state for one pass: the repository it plays over, and the card as it reads now. */
export interface PlanSceneState {
  pass: number;
  repository: InMemoryBacklogRepository;
  detail: CardDetail | null;
}

export type SetPlanScene = Dispatch<SetStateAction<PlanSceneState>>;

interface ScriptState {
  cardId?: string;
}

interface ScriptContext {
  repository: InMemoryBacklogRepository;
  projectId: string;
  setScene: SetPlanScene;
  state: ScriptState;
}

interface AgentStep {
  /** Scene time (ms) the step fires at. */
  at: number;
  run: (ctx: ScriptContext) => Promise<void>;
}

/** Reads the card again and shows it, but only if this pass is still the one on screen. */
async function refresh(ctx: ScriptContext) {
  const id = ctx.state.cardId;
  if (!id) return;
  const detail = await ctx.repository.getCard(ctx.projectId, id);
  ctx.setScene((s) => (s.repository === ctx.repository ? { ...s, detail } : s));
}

const AGENT_STEPS: readonly AgentStep[] = [
  // 1. The agent takes the work into Refine. Its plan is not written yet.
  {
    at: 0,
    run: async (ctx) => {
      const card = await ctx.repository.createCard(
        ctx.projectId,
        {
          title: PLAN_CARD_TITLE,
          description: PLAN_CARD_DESCRIPTION,
          status: "refine",
          executor: "ai",
          category: "feature",
        },
        AGENT,
      );
      // The workflow first (JAVA-1592): the plan is refused without it, so the person's first try is refused for the plan.
      await ctx.repository.setWorkflow(ctx.projectId, card.id, { expectedVersion: card.version, workflow: PLAN_WORKFLOW }, AGENT);
      ctx.state.cardId = card.id;
      await refresh(ctx);
    },
  },
  // 2. Once the person has been refused, the agent writes how it will be done.
  {
    at: 6200,
    run: async (ctx) => {
      const id = ctx.state.cardId;
      if (!id) return;
      const fresh = await ctx.repository.getCard(ctx.projectId, id);
      await ctx.repository.updateCard(ctx.projectId, id, { expectedVersion: fresh.version, actionPlan: PLAN_TEXT });
      await refresh(ctx);
    },
  },
  // 3. A safety step for a run where the person's second try never happened (paused away, or
  //    reduced motion, which plays no cursor). Normally the card is already in To do and this
  //    finds nothing to do.
  {
    at: 11000,
    run: async (ctx) => {
      const id = ctx.state.cardId;
      if (!id) return;
      const fresh = await ctx.repository.getCard(ctx.projectId, id);
      if (fresh.status !== "refine") return;
      await ctx.repository.moveCard(ctx.projectId, id, {
        expectedVersion: fresh.version,
        status: "todo",
        position: END_OF_COLUMN,
      });
      await refresh(ctx);
    },
  },
];

/** Plays the agent's half of the plan scene over `repository`. */
export function usePlanScript(repository: InMemoryBacklogRepository, projectId: string, setScene: SetPlanScene): void {
  const scene = useTheaterScene();
  const playing = scene?.playing ?? false;
  const getElapsed = scene?.getElapsed;
  const nextRef = useRef(0);
  const stateRef = useRef<ScriptState>({});
  // Steps await repository calls. A pause and a resume while one is still running must not start
  // the next one on top of it: every step is chained after the previous.
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  // A new repository is a new pass: the script starts over. Declared before the scheduler so it
  // resets before the scheduler reads the step.
  useEffect(() => {
    nextRef.current = 0;
    stateRef.current = {};
  }, [repository]);

  // With reduced motion the Theater never plays on its own, so no clock runs: the agent's steps
  // run straight through at mount and the card settles in To do with its plan.
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const ctx: ScriptContext = { repository, projectId, setScene, state: stateRef.current };
    nextRef.current = AGENT_STEPS.length;
    chainRef.current = chainRef.current.then(async () => {
      for (const step of AGENT_STEPS) {
        if (cancelled) return;
        await step.run(ctx);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repository, projectId, setScene]);

  useEffect(() => {
    if (!playing || !getElapsed) return;
    let cancelled = false;
    let timer = 0;
    const ctx: ScriptContext = { repository, projectId, setScene, state: stateRef.current };

    const schedule = () => {
      const index = nextRef.current;
      const step = AGENT_STEPS[index];
      if (!step) return;
      timer = window.setTimeout(() => {
        chainRef.current = chainRef.current.then(async () => {
          if (cancelled || nextRef.current !== index) return;
          nextRef.current = index + 1;
          await step.run(ctx);
          if (!cancelled) schedule();
        });
      }, Math.max(0, step.at - getElapsed()));
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playing, getElapsed, repository, projectId, setScene]);
}
