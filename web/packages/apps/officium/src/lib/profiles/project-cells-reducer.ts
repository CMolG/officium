import { changedCells, rebase, withCell, withMods, withRunCell, type CellRef } from "../backlog/role-matrix";
import type { RoleMatrix, RoleMatrixView, RunCell } from "../backlog/types";
import type { Notice } from "../../components/backlog/RolesNotice";

/** The project's cells while they are edited (JAVA-1627): what the draft started from, the draft, and what to announce. */
export interface State {
  /** What the draft started from: its version is what a save sends as `expectedVersion`. */
  base: RoleMatrixView | null;
  draft: RoleMatrix | null;
  notice: Notice | null;
}

export type Action =
  | { type: "loaded"; view: RoleMatrixView }
  | { type: "edit"; cell: CellRef; roles: string[] }
  | { type: "editRun"; cell: CellRef; run: RunCell }
  | { type: "editMods"; cell: CellRef; mods: string[] }
  | { type: "resetAll" }
  | { type: "discard"; view: RoleMatrixView }
  | { type: "saved"; view: RoleMatrixView }
  | { type: "conflict"; view: RoleMatrixView }
  | { type: "error"; message: string };

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "loaded": {
      const dirty = state.base && state.draft && changedCells(state.draft, state.base.effective) > 0;
      // A change from elsewhere never replaces a draft: it is announced, and the save that
      // follows answers 409 against the version the draft started from.
      if (dirty && action.view.version !== state.base!.version) return { ...state, notice: { kind: "stale" } };
      // The same version under a new base (a profile switched or saved): the project's own edits stay on top of it (D4).
      if (dirty) return { base: action.view, draft: rebase(state.draft!, state.base!.base, action.view.base), notice: state.notice };
      return { base: action.view, draft: action.view.effective, notice: state.notice?.kind === "stale" ? null : state.notice };
    }
    case "edit":
      return { ...state, draft: withCell(state.draft!, action.cell, action.roles), notice: null };
    case "editRun":
      return { ...state, draft: withRunCell(state.draft!, action.cell, action.run), notice: null };
    case "editMods":
      return { ...state, draft: withMods(state.draft!, action.cell, action.mods), notice: null };
    case "resetAll":
      return { ...state, draft: state.base!.base, notice: null };
    case "discard":
      return { base: action.view, draft: action.view.effective, notice: null };
    case "saved":
      return { base: action.view, draft: action.view.effective, notice: { kind: "saved" } };
    case "conflict":
      return {
        base: action.view,
        draft: action.view.effective,
        notice: { kind: "conflict", lost: changedCells(state.draft!, state.base!.effective) },
      };
    case "error":
      return { ...state, notice: { kind: "error", message: action.message } };
  }
}
