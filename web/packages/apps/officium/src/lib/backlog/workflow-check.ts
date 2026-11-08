import { PHASES } from "./role-matrix";
import type { Category, CardWorkflow, RoleMatrix, Signal, SpikeSubtype, WorkflowProblem } from "./types";

/**
 * `CardWorkflow.problemsFor` on the server (JAVA-1592): each phase the stored workflow names must still be eligible
 * for the card as it is now, under the project's matrix. Empty when the workflow fits, or there is none. The mod
 * check of the server is not mirrored here yet: the board learns the mods' problems from the server's view. An epic's
 * cards part (JAVA-1885) is checked against each part's row with no signals, so it fits every card of the row.
 */
export function workflowProblemsUnder(
  workflow: CardWorkflow | null | undefined,
  matrix: RoleMatrix,
  category: Category | null,
  subtype: SpikeSubtype | null,
  signals: readonly Signal[],
): WorkflowProblem[] {
  if (!workflow) return [];
  const row = category === "spike" && subtype === "ux-ui" ? "spike/ux-ui" : category;
  const parts = Object.entries(workflow.cards ?? {});
  if (parts.length > 0 && category !== "epic") {
    return [...picksProblems(workflow.phases, matrix, row, signals, "", "this card"),
      { phase: "cards", message: "only an epic's workflow has a part for its cards" }];
  }
  return [...picksProblems(workflow.phases, matrix, row, signals, "", "this card"),
    ...parts.flatMap(([partRow, picks]) => picksProblems(picks ?? {}, matrix, partRow, [], `cards.${partRow}.`, `a ${partRow} card`))];
}

function picksProblems(
  phases: CardWorkflow["phases"],
  matrix: RoleMatrix,
  row: string | null,
  signals: readonly Signal[],
  prefix: string,
  subject: string,
): WorkflowProblem[] {
  const problems: WorkflowProblem[] = [];
  for (const phase of PHASES) {
    const pick = phases[phase];
    if (!pick) continue;
    const eligible = new Set<string>(row ? matrix.categories[row]?.[phase] ?? [] : []);
    for (const signal of signals) for (const role of matrix.signals[signal]?.[phase] ?? []) eligible.add(role);
    if (!eligible.has(pick.role)) problems.push({ phase: `${prefix}${phase}`, message: `${pick.role} is not eligible for ${subject}` });
  }
  return problems;
}
