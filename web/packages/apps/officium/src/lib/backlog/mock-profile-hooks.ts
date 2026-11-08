import { setOwnerPlan, type OwnerPlan } from "../billing/owner-plan";
import { memoryProfilesClient } from "../profiles/memory-profiles";
import type { getSharedBacklogRepository } from "./memory-repository";
import type { MoveInput } from "./review-return-types";
import type { Actor } from "./types";

/** Work under a profile, played by a spec (card://JAVA-1527), apart so `mock-test-hooks.ts` stays under its bar. */
export interface ProfileMockHooks {
  /** Mirrors `profiles.activate`: the project runs under `profileId` (null: Officium's defaults). */
  activateProfile(projectId: string, profileId: string | null): Promise<void>;
  /** The owner's plan (JAVA-1007): `free` locks the roles, models and efforts editors; `personal` unlocks them. */
  simulateOwnerPlan(plan: OwnerPlan): void;
  /** Mirrors `cards.move` as an agent with everything it may carry: `role`, `reviewReturn`, `qualityScorecard`. */
  simulateAgentMoveWith(projectId: string, cardKey: string, input: Omit<MoveInput, "expectedVersion" | "position">): Promise<void>;
}

export function profileMockHooks(repository: ReturnType<typeof getSharedBacklogRepository>, agent: Actor): ProfileMockHooks {
  return {
    activateProfile: async (projectId, profileId) => void (await memoryProfilesClient.activate(projectId, profileId)),
    simulateOwnerPlan: setOwnerPlan,
    async simulateAgentMoveWith(projectId, cardKey, input) {
      const card = await repository.getCard(projectId, cardKey);
      await repository.moveCard(projectId, card.id, { ...input, expectedVersion: card.version, position: 1_000_000 }, agent);
    },
  };
}
