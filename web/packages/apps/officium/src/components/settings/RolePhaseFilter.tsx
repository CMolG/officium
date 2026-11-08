"use client";

import { ToggleGroup, ToggleGroupItem } from "@javadaba/ui";

import { PHASE_LABEL } from "../../lib/backlog/role-config";
import { PHASES } from "../../lib/backlog/role-matrix";
import type { Phase } from "../../lib/backlog/types";

export type PhaseChoice = Phase | "all";

/** The roles index narrowed to one phase (Cfg-Reference, "The long index"): All phases, or Refine to Deploy. */
export function RolePhaseFilter({ value, onChange }: { value: PhaseChoice; onChange: (next: PhaseChoice) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next as PhaseChoice)}
      aria-label="Filter roles by phase"
      className="flex-wrap justify-start gap-1.5"
    >
      <ToggleGroupItem value="all" variant="outline" size="sm" className="min-h-11 sm:min-h-0">
        All phases
      </ToggleGroupItem>
      {PHASES.map((phase) => (
        <ToggleGroupItem key={phase} value={phase} variant="outline" size="sm" className="min-h-11 sm:min-h-0">
          {PHASE_LABEL[phase]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
