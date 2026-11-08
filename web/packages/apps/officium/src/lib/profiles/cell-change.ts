import { withCell, withMods, withRunCell, type CellRef } from "../backlog/role-matrix";
import type { RoleMatrix, RunCell } from "../backlog/types";

/** One edit to one cell of a matrix: its roles, its model and effort, or the mods its roles follow (JAVA-1627). */
export type CellChange =
  | { type: "edit"; cell: CellRef; roles: string[] }
  | { type: "editRun"; cell: CellRef; run: RunCell }
  | { type: "editMods"; cell: CellRef; mods: string[] };

/** The matrix with one cell edited. The project's draft and a profile's draft are both edited through it. */
export function applyCellChange(matrix: RoleMatrix, change: CellChange): RoleMatrix {
  switch (change.type) {
    case "edit":
      return withCell(matrix, change.cell, change.roles);
    case "editRun":
      return withRunCell(matrix, change.cell, change.run);
    case "editMods":
      return withMods(matrix, change.cell, change.mods);
  }
}
