"use client";

import { useState } from "react";

import { Badge, Button, Text } from "@javadaba/ui";

import { cellOf, isOverridden, modsOf, runCellOf, type CellRef } from "../../lib/backlog/role-matrix";
import type { RoleMatrix } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";
import type { CellChange } from "../../lib/profiles/cell-change";
import { CellBaseNote } from "../backlog/CellBaseNote";
import { CellDialogs, type CellDialog } from "../backlog/CellDialogs";
import { CellModelPill } from "../backlog/CellModelPill";
import { CellModsPill } from "../backlog/CellModsPill";
import { CellRolePills } from "../backlog/CellRolePills";
import { PhaseMarker } from "../backlog/PhaseMarker";

/**
 * One phase of a group, as a table row (JAVA-1775, JAVA-1776): the phase, its roles, and for a category its model and
 * effort. In an editable cell a role opens its replacement dialog, and the model and the mods open their own; the cell
 * owns those dialogs, so the table's layout does not move them. Each dialog hands its result to `onChange`, which the
 * page keeps in its draft. It stacks below a container of 48rem, where the column names stay for assistive tech.
 * `markCustom` says the cell is the project's own and differs from `base`; a profile's cells are never marked.
 */
export function MatrixPhaseRow({
  cell,
  title,
  draft,
  base,
  editable,
  markCustom,
  baseName,
  runs,
  projectId,
  onChange,
}: {
  cell: CellRef;
  title: string;
  draft: RoleMatrix;
  base: RoleMatrix;
  editable: boolean;
  markCustom: boolean;
  /** What the base is called in the cell's note: the active profile's name, or Officium's defaults. */
  baseName: string;
  /** Whether the group has a model and effort per phase: the category rows do, the signal rows have none. */
  runs: boolean;
  /** The project the catalogs are read through; left out, the person's last one. */
  projectId?: string;
  onChange: (change: CellChange) => void;
}) {
  const [dialog, setDialog] = useState<CellDialog | null>(null);
  const roles = cellOf(draft, cell);
  const run = runCellOf(draft, cell);
  const mods = modsOf(draft, cell);
  const overridden = markCustom && isOverridden(draft, base, cell);
  const copy = useCopy().workProfile;

  // Reset sets the cell's roles, mods and run back to the base's, in the same draft.
  function reset() {
    onChange({ type: "edit", cell, roles: cellOf(base, cell) });
    onChange({ type: "editMods", cell, mods: modsOf(base, cell) });
    const baseRun = runCellOf(base, cell);
    if (baseRun) onChange({ type: "editRun", cell, run: baseRun });
  }

  return (
    <div
      role="row"
      data-testid="role-cell"
      data-row={cell.row}
      data-phase={cell.phase}
      data-overridden={overridden}
      className="flex min-w-0 flex-row flex-wrap items-center gap-x-2 gap-y-2 border-t border-[color:var(--jd-line)] py-2 @3xl:flex-nowrap @3xl:items-start @3xl:gap-2 @3xl:py-1.5"
    >
      <div role="rowheader" className="order-1 flex min-w-0 flex-1 flex-row flex-wrap items-center gap-2 @3xl:order-none @3xl:w-40 @3xl:flex-none @3xl:shrink-0">
        <PhaseMarker phase={cell.phase} />
        {overridden && (
          <Badge register="tag" tone="info" fill="subtle" size="xs">
            {copy.customBadge}
          </Badge>
        )}
      </div>
      <div role="cell" className="order-3 flex min-w-0 basis-full flex-col gap-1.5 @3xl:order-none @3xl:flex-1">
        <div className="flex flex-row flex-wrap items-start gap-1.5">
          <CellRolePills
            title={title}
            roles={roles}
            editable={editable}
            onReplace={(role) => setDialog({ kind: "replace", role })}
            onAdd={() => setDialog({ kind: "add" })}
          />
          <CellModsPill title={title} mods={mods} editable={editable} onMods={() => setDialog({ kind: "mods" })} />
        </div>
        {overridden && <CellBaseNote base={base} cell={cell} baseName={baseName} />}
        {editable && overridden && (
          <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 self-start" onClick={reset} title={copy.resetCellAtBase(baseName)}>
            {copy.resetCell(baseName)}
          </Button>
        )}
      </div>
      {runs && (
        <div role="cell" className="order-4 min-w-0 @3xl:order-none @3xl:w-36 @3xl:shrink-0">
          {run ? (
            <CellModelPill title={title} run={run} editable={editable} onModel={() => setDialog({ kind: "run" })} />
          ) : (
            <Text className="text-sm wrap-anywhere">{copy.notSet}</Text>
          )}
          {run?.roles && Object.keys(run.roles).length > 0 && <Text className="text-xs wrap-anywhere text-[color:var(--jd-muted)]">{copy.rolesDiffer}</Text>}
        </div>
      )}
      {runs && (
        <span aria-hidden="true" className="order-4 text-sm text-[color:var(--jd-muted)] @3xl:hidden">
          ·
        </span>
      )}
      {runs && (
        <div role="cell" data-testid="role-cell-effort" className="order-5 flex min-h-11 min-w-0 flex-row items-center @3xl:order-none @3xl:w-24 @3xl:shrink-0">
          <Text className="text-sm wrap-anywhere">{run ? run.effort : copy.notSet}</Text>
        </div>
      )}
      <CellDialogs
        dialog={dialog}
        cell={cell}
        title={title}
        roles={roles}
        run={run}
        mods={mods}
        projectId={projectId}
        onChange={onChange}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
