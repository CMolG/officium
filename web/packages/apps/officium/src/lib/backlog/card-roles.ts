import { MEMORY_MOD_RULES } from "./memory/mod-catalog";
import { governingWorkflow } from "./governing-workflow";
import { eligibleRolesUnder, modsUnder, runConfigsUnder } from "./role-config";
import { workflowProblemsUnder } from "./workflow-check";
import type { Card, CardWorkflow, RoleMatrix } from "./types";

/**
 * `eligibleRoles`, `runConfig`, `runConfigs` and `mods` are the server's to compute (JAVA-294, JAVA-915, JAVA-1569).
 * In the in-memory repository they are getters over the card's own category, status and signals,
 * and its project's matrix (JAVA-243), so no move, edit or matrix change can leave them stale; a
 * spread or a `structuredClone` copies their values like any other field.
 *
 * `workflow` and `workflowFrom` are the workflow that governs the card (JAVA-1885): its epic's part once the epic's is
 * written, read through `epicOf`, and the card's own otherwise. Writing `workflow` writes the card's own.
 */
export function withEligibleRoles(
  card: Omit<Card, "eligibleRoles" | "runConfig" | "runConfigs" | "mods" | "workflowProblems" | "workflowFrom">,
  matrixOf: (projectId: string) => RoleMatrix,
  epicOf: (card: Card) => Card | undefined = () => undefined,
): Card {
  let own: CardWorkflow | null = card.workflow ?? null;
  const governing = (c: Card) => governingWorkflow(c, own, c.epic ? epicOf(c) : undefined);
  const runs = (c: Card) => runConfigsUnder(matrixOf(c.projectId), c.category, c.subtype, c.status, c.signals);
  return Object.defineProperties(card, {
    eligibleRoles: {
      enumerable: true,
      get(this: Card) {
        return eligibleRolesUnder(matrixOf(this.projectId), this.category, this.subtype, this.status, this.signals);
      },
    },
    runConfig: {
      enumerable: true,
      get(this: Card) {
        return runs(this).runConfig;
      },
    },
    runConfigs: {
      enumerable: true,
      get(this: Card) {
        return runs(this).runConfigs;
      },
    },
    mods: {
      enumerable: true,
      get(this: Card) {
        return modsUnder(matrixOf(this.projectId), MEMORY_MOD_RULES, this.category, this.subtype, this.status, this.signals);
      },
    },
    workflow: {
      enumerable: true,
      get(this: Card) {
        return governing(this).workflow;
      },
      set(next: CardWorkflow | null) {
        own = next;
      },
    },
    workflowFrom: {
      enumerable: true,
      get(this: Card) {
        return governing(this).from;
      },
    },
    workflowProblems: {
      enumerable: true,
      get(this: Card) {
        const { workflow, problems } = governing(this);
        return workflow
          ? workflowProblemsUnder(workflow, matrixOf(this.projectId), this.category, this.subtype, this.signals)
          : problems;
      },
    },
  }) as Card;
}
