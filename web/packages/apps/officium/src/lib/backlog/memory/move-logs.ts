import { activeProfileId } from "../../profiles/memory-profiles";
import { runConfigsUnder } from "../role-config";
import type { MoveInput } from "../review-return-types";
import type { RoleMatrix } from "../role-matrix-types";
import type { Actor, Card, Status } from "../types";
import { recordLineage } from "./lineage";
import { recordReviewOutcome } from "./review-outcome";
import type { ProjectRecord } from "./sample-record";

/**
 * Everything the API logs once a move committed, in its order: the lineage (card://JAVA-1525), the review outcome
 * (card://JAVA-1526) and, on a status change, who ran the phase the card left (card://JAVA-1527): the project's
 * active profile, the role the mover named when the phase offers it, and that role's cell (the category cell's own
 * when it named none). `matrix` is the one in force before the move.
 */
export function recordMoveLogs(record: ProjectRecord, card: Card, from: Status, input: MoveInput, actor: Actor, matrix: RoleMatrix) {
  recordLineage(record, card, from, actor);
  recordReviewOutcome(card, from, input, actor);
  if (from === card.status) return;
  const { runConfig, runConfigs } = runConfigsUnder(matrix, card.category, card.subtype, from, card.signals);
  const role = input.role && runConfigs[input.role] ? input.role : null;
  const cell = role ? runConfigs[role] : runConfig;
  record.phaseRuns = [
    ...(record.phaseRuns ?? []),
    {
      cardId: card.id,
      at: card.updatedAt,
      actorKind: actor.kind,
      from,
      to: card.status,
      category: card.category,
      profileId: activeProfileId(record.project.id),
      role,
      model: cell?.model ?? null,
      effort: cell?.effort ?? null,
    },
  ];
}
