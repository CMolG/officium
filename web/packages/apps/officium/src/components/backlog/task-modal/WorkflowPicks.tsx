import { Link } from "@javadaba/ui/navigation";

import { PHASE_LABEL, modLabel, modSheetHref, roleLabel, roleSheetHref } from "../../../lib/backlog/role-config";
import { PHASES } from "../../../lib/backlog/role-matrix";
import type { CardWorkflow } from "../../../lib/backlog/types";

/** A card's stored workflow, one row per phase it names, in the order the phases run: each role and its mods lead to their sheets. */
export function WorkflowPicks({ workflow }: { workflow: CardWorkflow }) {
  const named = PHASES.filter((phase) => workflow.phases[phase]);
  return (
    <ul data-testid="workflow-picks" aria-label="Workflow phases" className="flex flex-col gap-2">
      {named.map((phase) => {
        const pick = workflow.phases[phase]!;
        return (
          <li key={phase} data-phase={phase} className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-medium">{PHASE_LABEL[phase]}</span>
            <Link href={roleSheetHref(pick.role)} className="flex min-h-11 flex-row items-center">
              {roleLabel(pick.role)}
            </Link>
            {pick.mods.map((mod) => (
              <Link key={mod} href={modSheetHref(mod)} className="flex min-h-11 flex-row items-center text-xs">
                {modLabel(mod)}
              </Link>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
