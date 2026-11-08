import { Text } from "@javadaba/ui";

import { runLabel } from "../../lib/backlog/role-matrix";
import type { RunCell } from "../../lib/backlog/types";

/** The model and effort a phase of a category is worked with (JAVA-915), and whether a role of it
 *  is worked with another. Read-only: the project's Roles page edits it. */
export function PhaseRunConfig({ run }: { run: RunCell | null }) {
  if (!run) return null;
  const others = Object.keys(run.roles ?? {}).length;
  return (
    <Text data-testid="category-phase-run" className="text-xs text-[color:var(--jd-muted)]">
      {`Worked with ${runLabel(run)}${others ? ` (${others === 1 ? "one role differs" : `${others} roles differ`})` : ""}`}
    </Text>
  );
}
