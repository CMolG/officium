/**
 * The two header lines an action plan carries at the Refine exit (JAVA-1592), as `PlanContract.planProblems`
 * checks them on the server: the first non-blank line opens with `Base:`, and when the workflow names a refine
 * role, a line reads `Role: <that role>`. The problems in words, or none.
 */
export function planHeaderProblems(actionPlan: string, refineRole: string | null): string[] {
  if (!actionPlan.trim()) {
    return ["the card has no action plan (cards.update actionPlan, opening with `Base: <control branch | main | branch name>`)"];
  }
  const lines = actionPlan.split("\n").map((line) => line.trim()).filter((line) => line !== "");
  const problems: string[] = [];
  if (!lines[0].startsWith("Base:")) {
    problems.push("the action plan's first line is not `Base: <control branch | main | branch name>`");
  }
  if (refineRole !== null && !lines.some((line) => namesRole(line, refineRole))) {
    problems.push(`the action plan has no \`Role: ${refineRole}\` line (the workflow's refine role)`);
  }
  return problems;
}

/**
 * The read view joins soft line breaks, so `Base:` and `Role:` would share one line: each header line gets its own
 * paragraph. Display only; the stored plan keeps its lines.
 */
export function headerLinesApart(actionPlan: string): string {
  return actionPlan.replace(/^((?:Base|Role):[^\n]*)\n(?=(?:Base|Role):)/gm, "$1\n\n");
}

/** The id ends at the first whitespace or one of `. , ; (`: `Role: tech-lead. Prose` names tech-lead, `tech-leader` does not. */
function namesRole(line: string, role: string): boolean {
  const head = `Role: ${role}`;
  const rest = line.slice(head.length);
  return line.startsWith(head) && (rest === "" || /^[\s.,;(]/.test(rest));
}
