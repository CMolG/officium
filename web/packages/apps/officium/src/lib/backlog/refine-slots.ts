import { exemptFrom } from "./plan-gate";
import type { Card } from "./types";

/**
 * Whether a card shows the Refine exit's two slots (JAVA-1592): an `ai` card in Refine whose category exits through
 * them. A routine's runbook, a hotfix's express refine and an epic's children have their own way out, as the
 * server's `PlanContract` says, so they keep the plain plan section.
 */
export function showsRefineSlots(card: Pick<Card, "executor" | "category" | "status">): boolean {
  return card.status === "refine" && card.executor === "ai" && !exemptFrom(card.category);
}
