import type { InMemoryBacklogRepository } from "../../lib/backlog/memory-repository";
import type { Actor } from "../../lib/backlog/types";
import type { StorageUsage } from "../../lib/backlog/storage-usage";
import type { SceneStep } from "./use-scene-steps";

/** Every Linear figure the room scene shows, and its proof line. The one source. */
export const LINEAR = {
  page: "linear.app/pricing",
  checkedOn: "2026-10-19",
  basic: 10,
  business: 16,
} as const;

/** Four people, not five: a fifth seat with no price would claim what billing may not enforce. */
export const PEOPLE = ["Ana", "Ben", "Carla", "Dani"] as const;

/** The scene's length: the last step plus a beat to read the end state. */
export const ROOM_SCRIPT_MS = 12_500;

const BATCHES = 6;
const CARDS_PER_BATCH = 267;
const BATCH_FROM_MS = 5200;
const BATCH_EVERY_MS = 700;

/** About 1.2 KB of text a card: 1,600 cards read about 2 MB of the 15 MB free start. */
const CARD_TEXT = "Officium keeps the text of every card and page of this project in the room it is given. ".repeat(14);

const ACTOR: Actor = { kind: "agent", accountId: "acc-demo-room", name: "Claude Code", agentName: "claude-code" };

export interface RoomContext {
  repository: InMemoryBacklogRepository;
  projectId: string;
  setSeats: (seats: number) => void;
  setCards: (cards: number) => void;
  /** Moves the handle to Officium, unless the reader has already moved it. */
  handOff: () => void;
  setUsage: (usage: StorageUsage) => void;
}

/** Writes one batch of cards, then reads the meter the way the product does (`getUsage`). */
function batchStep(index: number): SceneStep<RoomContext> {
  return {
    at: BATCH_FROM_MS + index * BATCH_EVERY_MS,
    run: async (ctx) => {
      for (let n = 0; n < CARDS_PER_BATCH; n++) {
        await ctx.repository.createCard(
          ctx.projectId,
          { title: `Room card ${index * CARDS_PER_BATCH + n + 1}`, description: CARD_TEXT, status: "todo", executor: "ai" },
          ACTOR,
        );
      }
      ctx.setCards((index + 1) * CARDS_PER_BATCH);
      ctx.setUsage(await ctx.repository.getUsage());
    },
  };
}

/**
 * The room scene's steps, read as one timeline: the seats appear one by one on the left, the handle
 * slides from the seats to Officium's room, and the cards fill the meter on the right.
 */
export const ROOM_STEPS: readonly SceneStep<RoomContext>[] = [
  ...PEOPLE.map((_, index): SceneStep<RoomContext> => ({
    at: 700 + index * 600,
    run: async (ctx) => ctx.setSeats(index + 1),
  })),
  { at: 4200, run: async (ctx) => ctx.handOff() },
  ...Array.from({ length: BATCHES }, (_, index) => batchStep(index)),
];
