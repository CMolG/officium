"use client";

import { useEffect, useRef } from "react";
import { theaterTarget, type TheaterCursor } from "@javadaba/ui";

import type { InMemoryBacklogRepository } from "../../lib/backlog/memory-repository";
import type { Actor, Card } from "../../lib/backlog/types";
import { isSendBack } from "../../lib/backlog/review-returns";
import { useSceneSteps, type SceneStep } from "./use-scene-steps";

/**
 * BOARD AUTOPILOT -- ONLY for the product page's Theater scene (`board-scene.tsx`). It is not
 * product logic: `/app` never imports this file.
 *
 * The scene is a two-hander, and each actor plays through the channel it really uses:
 *
 * - **The agent** writes DATA, through the same `BacklogRepository` calls an MCP tool makes --
 *   creates cards, moves one to "doing", reports what it is doing, raises a human card that
 *   blocks it. `Board` reacts through `subscribe()`, exactly as it will to a live SSE event.
 * - **The person** uses the UI, through Theater's ghost cursor (`BOARD_CURSOR`): opens the card
 *   that needs them, changes its status in the modal, then filters the board and switches views.
 *   Those are real clicks on the real controls, so a viewer who pauses can do the same.
 *
 * Both run on the SCENE's clock (`useTheaterScene().getElapsed`), not on timers armed at mount:
 * hovering, tapping or scrolling the Theater away freezes the agent and the cursor together, and
 * they resume in step.
 *
 * One known, accepted limitation: `moveCard` on `BacklogRepository` takes no actor parameter
 * (it always attributes the write to the signed-in person) -- a repository shape owned by the
 * app's live-wiring track (JDB-226), not restructured here. Nothing in the board's UI displays
 * that field, so it is invisible to a viewer.
 */

const AGENT: Actor = { kind: "agent", accountId: "acc-demo-agent", name: "Claude Code", agentName: "claude-code" };

const PLAN_TITLES = [
  "Add the pricing page hero section",
  "Wire the checkout confirmation email",
  "Write the launch announcement post",
] as const;

const HUMAN_CARD_TITLE = "Set the Stripe key";

/** What the script remembers between steps: the cards it created. */
interface ScriptState {
  plan?: Card;
  human?: Card;
}

interface ScriptContext {
  repository: InMemoryBacklogRepository;
  projectId: string;
  state: ScriptState;
}

async function createPlanCard(ctx: ScriptContext, index: number) {
  const card = await ctx.repository.createCard(
    ctx.projectId,
    { title: PLAN_TITLES[index], status: "todo", executor: "ai", epic: "Launch week" },
    AGENT,
  );
  if (index === 0) ctx.state.plan = card;
}

/** Moves `card` to `status` unless it is already there. Reads it fresh: the person may have
 *  touched it since the script last did. A conflict just leaves it where it is. */
async function move(ctx: ScriptContext, card: Card | undefined, status: Card["status"]) {
  if (!card) return;
  const fresh = await ctx.repository.getCard(ctx.projectId, card.id);
  // A send-back carries its reasons and findings, which a scripted move has none of: the demo never goes backwards.
  if (fresh.status === status || isSendBack(fresh.status, status)) return;
  await ctx.repository.moveCard(ctx.projectId, fresh.id, { expectedVersion: fresh.version, status, position: 0 });
}

/**
 * The agent's half. Times are interleaved with `BOARD_CURSOR` below: read the two lists side by
 * side. Every step tolerates the person having got there first (a viewer who paused and played
 * with the board), because a demo that breaks when touched is worse than no demo.
 */
const AGENT_STEPS: readonly SceneStep<ScriptContext>[] = [
  // 1. The agent turns a plan into three cards; they rise into "To do" one after another.
  { at: 700, run: (ctx) => createPlanCard(ctx, 0) },
  { at: 1200, run: (ctx) => createPlanCard(ctx, 1) },
  { at: 1700, run: (ctx) => createPlanCard(ctx, 2) },
  // 2. It picks the first one up: the card glides to "In progress" and it says what it's doing.
  {
    at: 4200,
    run: async (ctx) => {
      const { plan } = ctx.state;
      if (!plan) return;
      await move(ctx, plan, "doing");
      await ctx.repository.setActivelyWorking(ctx.projectId, plan.key, true, AGENT);
      await ctx.repository.reportStatus(ctx.projectId, plan.key, "Building the pricing hero section", AGENT);
    },
  },
  // 3. It hits a wall and hands the person, as a card, what only a person can do.
  {
    at: 7000,
    run: async (ctx) => {
      const { plan } = ctx.state;
      if (!plan) return;
      const human = await ctx.repository.createCard(
        ctx.projectId,
        {
          title: HUMAN_CARD_TITLE,
          description:
            "Why this needs you: the checkout flow can't go live without a real Stripe secret "
            + "key.\n\nSteps: create the key in the Stripe dashboard, add it to the deploy "
            + `secrets.\n\nDone when: ${plan.key} charges a test card successfully.\n\nUnblocks: ${plan.key}.`,
          executor: "human",
          status: "todo",
        },
        AGENT,
      );
      ctx.state.human = human;
      const fresh = await ctx.repository.getCard(ctx.projectId, human.id);
      await ctx.repository.linkCard(ctx.projectId, fresh.id, { expectedVersion: fresh.version, type: "blocks", target: plan.key }, AGENT);
      await ctx.repository.reportStatus(ctx.projectId, plan.key, `Blocked: waiting on ${human.key}`, AGENT);
    },
  },
  // 4. (The person closes the human card through the modal -- `BOARD_CURSOR`.) This step only
  //    makes sure it IS closed, for a run where the cursor's click was paused away or never
  //    happened (reduced motion plays no cursor at all). Normally it finds nothing to do.
  { at: 12600, run: (ctx) => move(ctx, ctx.state.human, "deploy") },
  // 5. Unblocked, the agent finishes and hands its card over for review.
  {
    at: 13400,
    run: async (ctx) => {
      const { plan } = ctx.state;
      if (!plan) return;
      await ctx.repository.reportStatus(ctx.projectId, plan.key, "Key found. Charging a test card", AGENT);
    },
  },
  {
    at: 15200,
    run: async (ctx) => {
      const { plan } = ctx.state;
      if (!plan) return;
      await move(ctx, plan, "review");
      await ctx.repository.setActivelyWorking(ctx.projectId, plan.key, false, AGENT);
    },
  },
];

/**
 * The person's half, played by Theater's ghost cursor. `act: true` is a real click on the real
 * control -- the same button a viewer can press.
 */
export const BOARD_CURSOR: readonly TheaterCursor[] = [
  // The card the agent raised shows up in "Needs you": open it...
  { at: 8800, target: theaterTarget("needs-you-card"), click: true, act: true },
  // ...change its status to Deploy from the modal...
  { at: 10000, target: theaterTarget("card-status"), click: true, act: true },
  { at: 11000, target: '[role="listbox"] [data-value="deploy"]', click: true, act: true },
  // ...and close it: the agent's card is no longer blocked.
  { at: 12000, target: theaterTarget("card-close"), click: true, act: true },
  // Then the board itself: only the agents' work, as a list, and back.
  { at: 16000, target: theaterTarget("filter-executor"), click: true, act: true },
  { at: 16800, target: '[role="listbox"] [data-value="ai"]', click: true, act: true },
  { at: 18200, target: theaterTarget("view-list"), click: true, act: true },
  { at: 19400, target: theaterTarget("filter-priority"), click: true, act: true },
  { at: 20000, target: theaterTarget("filter-priority-high"), click: true, act: true },
  { at: 21000, target: theaterTarget("filter-clear"), click: true, act: true },
  { at: 22800, target: theaterTarget("view-board"), click: true, act: true },
];

/** The scene's length in the Theater: the last step plus a beat to read the end state. */
export const BOARD_SCRIPT_MS = 25_500;

export function useBoardAutopilot(repository: InMemoryBacklogRepository, projectId: string): void {
  const stateRef = useRef<ScriptState>({});

  // A new repository is a new pass of the scene (`board-scene.tsx`): the script starts over. This
  // effect is declared before the shared scheduler, so the reset lands before the first step.
  useEffect(() => {
    stateRef.current = {};
  }, [repository]);

  useSceneSteps(AGENT_STEPS, () => ({ repository, projectId, state: stateRef.current }), repository);
}
