import type { RunCell, RunConfig } from "./role-matrix-types";
import { roleError } from "./role-matrix";

/**
 * Editing the roles of one matrix cell (JAVA-1776): replace, remove and add a role, and the model and effort a
 * role is worked with inside the cell. Pure, with type-only imports, so `scripts/test/officium-cell-role-edit.test.mjs`
 * runs it under plain `node --test`. The dialogs call these and hand the result to the page's draft.
 */

/** A cell's run with one role's own config set, or (`own` undefined) taken back to the cell's. */
export function withRoleRun(run: RunCell, role: string, own: RunConfig | undefined): RunCell {
  const roles = { ...run.roles };
  if (own) roles[role] = own;
  else delete roles[role];
  return Object.keys(roles).length ? { ...run, roles } : { model: run.model, effort: run.effort };
}

/**
 * `from` leaves its place to `to`, in the same order. The slot keeps its config: `own` is the model and effort the
 * new role is worked with (the dialog shows it before Save), in place of `from`'s own config.
 */
export function replaceRole(
  roles: readonly string[],
  run: RunCell | null,
  from: string,
  to: string,
  own: RunConfig | undefined,
): { roles: string[]; run: RunCell | null } {
  return {
    roles: roles.map((role) => (role === from ? to : role)),
    run: run && withRoleRun(withRoleRun(run, from, undefined), to, own),
  };
}

/** The cell without `role`. Its own model goes with it, or it would wait unseen for the role to come back. */
export function removeRole(roles: readonly string[], run: RunCell | null, role: string): { roles: string[]; run: RunCell | null } {
  return {
    roles: roles.filter((r) => r !== role),
    run: run?.roles?.[role] ? withRoleRun(run, role, undefined) : run,
  };
}

/** The cell with `role` appended, or unchanged when `roleError` refuses it (a duplicate, or a full cell). */
export function addRole(roles: readonly string[], role: string): string[] {
  return roleError(role, roles) === null ? [...roles, role] : [...roles];
}

/** The roles a picker offers, in two groups: those the workflow gives this phase first, then the rest. A role the cell holds is left out. */
export function rolePickerGroups(
  options: readonly string[],
  taken: readonly string[],
  usuallyWorks: (role: string) => boolean,
): { usual: string[]; other: string[] } {
  const free = options.filter((role) => !taken.includes(role));
  return {
    usual: free.filter(usuallyWorks),
    other: free.filter((role) => !usuallyWorks(role)),
  };
}
