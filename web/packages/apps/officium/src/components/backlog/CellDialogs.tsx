"use client";

import type { CellRef } from "../../lib/backlog/role-matrix";
import type { RunCell } from "../../lib/backlog/role-matrix-types";
import type { CellChange } from "../../lib/profiles/cell-change";
import { CellModsDialog } from "./CellModsDialog";
import { RolePickerDialog } from "./RolePickerDialog";
import { RunPickerDialog } from "./RunPickerDialog";

/** The dialog a cell has open, if any (JAVA-1776): the cell owns it, so the table's layout does not move it. */
export type CellDialog = { kind: "replace"; role: string } | { kind: "add" } | { kind: "run" } | { kind: "mods" };

/** The one dialog a cell has open. Each one hands its result to `onChange` and closes. */
export function CellDialogs({
  dialog,
  cell,
  title,
  roles,
  run,
  mods,
  projectId,
  onChange,
  onClose,
}: {
  dialog: CellDialog | null;
  cell: CellRef;
  title: string;
  roles: string[];
  run: RunCell | null;
  mods: string[];
  projectId?: string;
  onChange: (change: CellChange) => void;
  onClose: () => void;
}) {
  if (!dialog) return null;
  if (dialog.kind === "mods") {
    return (
      <CellModsDialog
        title={title}
        mods={mods}
        roles={roles}
        projectId={projectId}
        onSave={(next) => {
          onChange({ type: "editMods", cell, mods: next });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }
  if (dialog.kind === "run") {
    if (!run) return null;
    return (
      <RunPickerDialog
        title={title}
        run={run}
        onSave={(next) => {
          onChange({ type: "editRun", cell, run: next });
          onClose();
        }}
        onClose={onClose}
      />
    );
  }
  const replacing = dialog.kind === "replace";
  return (
    <RolePickerDialog
      title={title}
      phase={cell.phase}
      mode={replacing ? "replace" : "add"}
      current={replacing ? dialog.role : undefined}
      roles={roles}
      run={run}
      onSave={(next) => {
        onChange({ type: "edit", cell, roles: next.roles });
        if (run && next.run) onChange({ type: "editRun", cell, run: next.run });
        onClose();
      }}
      onClose={onClose}
    />
  );
}
