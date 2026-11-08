"use client";

import { Button, Text } from "@javadaba/ui";

import { runLabel } from "../../lib/backlog/role-matrix";
import type { RunConfig } from "../../lib/backlog/types";
import { RunConfigFields } from "./RunConfigFields";

/**
 * One role's model and effort inside a cell (JAVA-915): the cell's, until the owner gives it its
 * own -- the user's choice is that a role's override lives in the cell, so the same role can be
 * worked differently in another category or phase.
 */
export function RoleRunOverride({
  role,
  label,
  cell,
  own,
  onChange,
}: {
  role: string;
  label: string;
  cell: RunConfig;
  own: RunConfig | undefined;
  onChange: (own: RunConfig | undefined) => void;
}) {
  if (!own) {
    return (
      <div className="flex flex-row flex-wrap items-center gap-2" data-testid="role-run" data-role={role} data-own="false">
        <Text className="min-w-0 flex-1 text-xs text-[color:var(--jd-muted)]">{`Same as the cell: ${runLabel(cell)}`}</Text>
        <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11" onClick={() => onChange({ ...cell })}>
          {`Give ${label} its own`}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5" data-testid="role-run" data-role={role} data-own="true">
      <RunConfigFields label={label} value={own} onChange={onChange} />
      <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 self-start" onClick={() => onChange(undefined)}>
        Same as the cell
      </Button>
    </div>
  );
}
