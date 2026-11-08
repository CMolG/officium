import type { Actor, Card, Status } from "../types";
import { isCorrective, isLineageCheckpoint, parseLineage } from "../quality-lineage";
import { newId } from "../format";
import { now } from "./rules";
import type { ProjectRecord } from "./sample-record";

/**
 * What the API's `LineageRecorder` writes after a create or a move (card://JAVA-1525): a corrective card whose
 * description states a complete lineage naming another card logs the escaped defect on that origin, once per pair,
 * and the two cards become related. The card's own `lineage` always follows its description.
 */
export function recordLineage(record: ProjectRecord, card: Card, from: Status | null, actor: Actor) {
  card.lineage = parseLineage(card.description);
  if (!isCorrective(card.category) || !isLineageCheckpoint(from, card.status)) return;
  const lineage = card.lineage;
  if (!lineage || lineage.causedBy === "legacy" || lineage.causedBy === card.key) return;
  const origin = [...record.cards.values()].find((c) => c.key === lineage.causedBy);
  if (!origin || (origin.escapedDefects ?? []).some((d) => d.correctiveKey === card.key)) return;
  origin.escapedDefects = [
    ...(origin.escapedDefects ?? []),
    {
      id: newId(`${origin.id}-escaped`),
      at: now(),
      by: actor,
      correctiveKey: card.key,
      escapedIn: lineage.escapedIn ?? "action",
      qualityDimension: lineage.qualityDimension ?? "functional",
      violatedRules: lineage.violatedRules,
    },
  ];
  origin.qualityRegressionTriggered = true;
  if (!origin.related.includes(card.key)) origin.related = [...origin.related, card.key];
  if (!card.related.includes(origin.key)) card.related = [...card.related, origin.key];
}
