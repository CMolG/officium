import type { Effort, Phase, RoleMatrix, RunCell } from "./role-matrix-types";

/**
 * Editing a project's role matrix (JAVA-243) over the server's override (officium-api.md §8.9).
 * The view edits the EFFECTIVE matrix, the one the project's cards are read against, and saves
 * only the cells that differ from the default: a cell the override names replaces the default
 * one, so sending a cell equal to it would pin today's default against tomorrow's.
 *
 * Pure, with type-only imports, so `scripts/test/officium-role-matrix-edit.test.mjs` runs it
 * under plain `node --test`. The default itself is `role-config.ts`'s.
 */

export const PHASES: readonly Phase[] = ["refine", "action", "ready", "review", "deploy"];

/** The server's limits (`RoleMatrix.fromWire`): refused here first, before any request. */
export const MAX_ROLES_PER_CELL = 20;
const ROLE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** The server's limit on mods in a cell (`ModMatrix.fromWire`, card://JAVA-1569). */
export const MAX_MODS_PER_CELL = 20;

export type RowKind = "categories" | "signals";

export interface CellRef {
  kind: RowKind;
  row: string;
  phase: Phase;
}

export function cellOf(matrix: RoleMatrix, { kind, row, phase }: CellRef): string[] {
  return matrix[kind][row]?.[phase] ?? [];
}

function sameRoles(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((role, i) => role === b[i]);
}

/** The mods a cell mounts (card://JAVA-1569): `matrix.mods[row][phase]`, whatever the role, for a category row or a signal. */
export function modsOf(matrix: RoleMatrix, { row, phase }: CellRef): string[] {
  return matrix.mods?.[row]?.[phase] ?? [];
}

/** The matrix with one cell's mods replaced; the input is left as it was. */
export function withMods(matrix: RoleMatrix, { row, phase }: CellRef, mods: string[]): RoleMatrix {
  const all = matrix.mods ?? {};
  return { ...matrix, mods: { ...all, [row]: { ...all[row], [phase]: [...mods] } } };
}

/** Whether two cells hold the same mods in the same order. */
export const sameMods = sameRoles;

/** Why `mod` cannot be added to a cell that holds `cell`, in words, or null when it can. */
export function modError(mod: string, cell: readonly string[]): string | null {
  if (!mod) return "Pick a mod first.";
  if (!ROLE_ID.test(mod)) return "A mod id is lowercase words joined by hyphens, like rule-enforcer.";
  if (cell.includes(mod)) return "That mod is already in this cell.";
  if (cell.length >= MAX_MODS_PER_CELL) return `A cell holds at most ${MAX_MODS_PER_CELL} mods.`;
  return null;
}

/** The matrix with one cell replaced; the input is left as it was. */
export function withCell(matrix: RoleMatrix, cell: CellRef, roles: string[]): RoleMatrix {
  return {
    ...matrix,
    [cell.kind]: { ...matrix[cell.kind], [cell.row]: { ...matrix[cell.kind][cell.row], [cell.phase]: [...roles] } },
  };
}

function eachCell(a: RoleMatrix, b: RoleMatrix, visit: (cell: CellRef) => void) {
  for (const kind of ["categories", "signals"] as const) {
    // A row that only holds mods (card://JAVA-1569) is a cell too: its kind is the one the row belongs to.
    const modRows = [...Object.keys(a.mods ?? {}), ...Object.keys(b.mods ?? {})].filter((row) => (row in a.signals || row in b.signals) === (kind === "signals"));
    const rows = new Set([...Object.keys(a[kind]), ...Object.keys(b[kind]), ...modRows]);
    for (const row of rows) for (const phase of PHASES) visit({ kind, row, phase });
  }
}

/** Whether two cells differ, in their roles, their mods or (a category cell, JAVA-915) in their model and effort. */
function cellDiffers(a: RoleMatrix, b: RoleMatrix, cell: CellRef): boolean {
  if (!sameRoles(cellOf(a, cell), cellOf(b, cell)) || !sameMods(modsOf(a, cell), modsOf(b, cell))) return true;
  return cell.kind === "categories" && !sameRunCell(runCellOf(a, cell), runCellOf(b, cell));
}

/** Whether a cell of `matrix` is not the default one. A phase a row lacks has no roles. */
export function isOverridden(matrix: RoleMatrix, defaults: RoleMatrix, cell: CellRef): boolean {
  return cellDiffers(matrix, defaults, cell);
}

/* ---- The layers of a work profile (JAVA-1627): a project's cells sit on a BASE, the active
 *      profile's matrix, else Officium's defaults. ---- */

/** The `overrides` a draft saves against its base, applied again over a new base: the project's
 *  own edits survive a switch of profile, and a cell the new base already makes drops out. */
export function rebase(draft: RoleMatrix, oldBase: RoleMatrix, newBase: RoleMatrix): RoleMatrix {
  return overlay(newBase, overridesFrom(draft, oldBase));
}

/** A cell in words: its roles, then for a category cell its model and effort, then its mods
 *  ("Backend developer, Frontend developer - Haiku 5.5 - medium - 1 mod"). The page passes its
 *  role labeller: `roleLabel` lives in `role-config.ts`, which only the bundler can load. */
export function describeCell(matrix: RoleMatrix, cell: CellRef, roleName: (id: string) => string): string {
  const roles = cellOf(matrix, cell).map(roleName).join(", ") || "No roles";
  const run = runCellOf(matrix, cell);
  const mods = modsOf(matrix, cell).length;
  const parts = [roles];
  if (run) parts.push(`${modelLabel(run.model)} - ${run.effort}`);
  if (mods > 0) parts.push(`${mods} ${mods === 1 ? "mod" : "mods"}`);
  return parts.join(" - ");
}

/** The `overrides` to save for an edited matrix: every cell that differs from the default, and
 *  nothing else -- `{categories: {}, signals: {}, runs: {}, mods: {}}` when it is the default throughout.
 *  `runs` and `mods` are always sent, so the server replaces the project's instead of keeping them. */
export function overridesFrom(edited: RoleMatrix, defaults: RoleMatrix): RoleMatrix {
  const overrides: RoleMatrix = { categories: {}, signals: {}, runs: {}, mods: {} };
  eachCell(edited, defaults, (cell) => {
    if (!sameMods(modsOf(edited, cell), modsOf(defaults, cell))) {
      (overrides.mods![cell.row] ??= {})[cell.phase] = [...modsOf(edited, cell)];
    }
    if (!sameRoles(cellOf(edited, cell), cellOf(defaults, cell))) {
      (overrides[cell.kind][cell.row] ??= {})[cell.phase] = [...cellOf(edited, cell)];
    }
    const run = runCellOf(edited, cell);
    if (cell.kind === "categories" && run && !sameRunCell(run, runCellOf(defaults, cell))) {
      (overrides.runs![cell.row] ??= {})[cell.phase] = structuredClone(run);
    }
  });
  return overrides;
}

/** `RoleMatrix.overlay` on the server: the defaults with every cell the override names replaced. */
export function overlay(defaults: RoleMatrix, overrides: RoleMatrix): RoleMatrix {
  let effective = defaults;
  for (const kind of ["categories", "signals"] as const) {
    for (const [row, cells] of Object.entries(overrides[kind])) {
      for (const phase of PHASES) {
        const roles = cells[phase];
        if (roles) effective = withCell(effective, { kind, row, phase }, roles);
      }
    }
  }
  for (const [row, cells] of Object.entries(overrides.runs ?? {})) {
    for (const phase of PHASES) {
      const run = cells[phase];
      if (run) effective = withRunCell(effective, { kind: "categories", row, phase }, run);
    }
  }
  for (const [row, cells] of Object.entries(overrides.mods ?? {})) {
    for (const phase of PHASES) {
      const mods = cells[phase];
      if (mods) effective = withMods(effective, { kind: "categories", row, phase }, mods);
    }
  }
  return effective;
}

/** How many cells differ between two matrices: a draft against what was saved. */
export function changedCells(a: RoleMatrix, b: RoleMatrix): number {
  let count = 0;
  eachCell(a, b, (cell) => {
    if (cellDiffers(a, b, cell)) count += 1;
  });
  return count;
}

/** Why `role` cannot be added to `cell`, in words, or null when it can. */
export function roleError(role: string, cell: readonly string[]): string | null {
  if (!role) return "Type a role id first.";
  if (!ROLE_ID.test(role)) return "A role id is lowercase words joined by hyphens, like frontend-developer.";
  if (cell.includes(role)) return "That role is already in this cell.";
  if (cell.length >= MAX_ROLES_PER_CELL) return `A cell holds at most ${MAX_ROLES_PER_CELL} roles.`;
  return null;
}

/** Every role id the default matrix names, sorted: the suggestions until roles have a catalog
 *  (JAVA-374). */
export function roleSuggestions(defaults: RoleMatrix): string[] {
  const roles = new Set<string>();
  for (const kind of ["categories", "signals"] as const) {
    for (const row of Object.values(defaults[kind])) for (const list of Object.values(row)) for (const role of list ?? []) roles.add(role);
  }
  return [...roles].sort();
}

/* ---- The model and effort a cell is worked with (JAVA-915) ---- */

export const EFFORTS: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];

/** The ids offered for a model: any well-formed id is accepted, so a new model needs no deploy. */
export const MODEL_SUGGESTIONS: readonly string[] = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-haiku-4-5", "claude-fable-5-1"];

const MODEL_ID = /^[a-z0-9]+([.-][a-z0-9]+)*$/;

/** A category cell's model and effort; null for a signal cell, or a row the matrix has none for. */
export function runCellOf(matrix: RoleMatrix, { kind, row, phase }: CellRef): RunCell | null {
  return kind === "categories" ? matrix.runs?.[row]?.[phase] ?? null : null;
}

/** The matrix with one category cell's model and effort replaced; the input is left as it was. */
export function withRunCell(matrix: RoleMatrix, { row, phase }: CellRef, run: RunCell): RoleMatrix {
  const runs = matrix.runs ?? {};
  return { ...matrix, runs: { ...runs, [row]: { ...runs[row], [phase]: structuredClone(run) } } };
}

function sameRunCell(a: RunCell | null, b: RunCell | null): boolean {
  if (!a || !b) return a === b;
  const roles = (cell: RunCell) => Object.entries(cell.roles ?? {}).sort(([x], [y]) => x.localeCompare(y));
  return a.model === b.model && a.effort === b.effort && JSON.stringify(roles(a)) === JSON.stringify(roles(b));
}

/** A model id in words: `claude-opus-5-5` -> "Opus 5.5"; an id it can't read stays as it is. */
export function modelLabel(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  return m ? `${m[1].charAt(0).toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}` : id;
}

/** A run config in words, the way a cell shows it: "Opus 5.5 · xhigh". */
export function runLabel(run: { model: string; effort: Effort }): string {
  return `${modelLabel(run.model)} · ${run.effort}`;
}

/** Why `model` cannot be a cell's model, in words, or null when it can (`RunConfig` on the server). */
export function modelError(model: string): string | null {
  if (!model) return "Type a model id first.";
  if (model.length > 64 || !MODEL_ID.test(model)) return "A model id is lowercase, like claude-sonnet-5-5.";
  return null;
}

function isValidRunConfig(run: unknown): boolean {
  const { model, effort } = (run ?? {}) as Partial<RunCell>;
  return typeof model === "string" && modelError(model) === null && EFFORTS.includes(effort as Effort);
}

/** `RoleMatrix.fromWire`'s checks: a row, phase or signal the default does not have, a role that
 *  is not kebab-case, more than 20 in a cell, or a run cell whose model, effort or roles are not. */
export function isValidOverrides(overrides: RoleMatrix, defaults: RoleMatrix): boolean {
  const phase = (p: string) => (PHASES as readonly string[]).includes(p);
  const rolesValid = (["categories", "signals"] as const).every((kind) =>
    Object.entries(overrides[kind] ?? {}).every(([row, cells]) =>
      row in defaults[kind]
      && Object.entries(cells).every(([p, roles]) =>
        phase(p) && Array.isArray(roles) && roles.length <= MAX_ROLES_PER_CELL && roles.every((r) => ROLE_ID.test(r)))));
  // The card workflow row (JAVA-1591) is not a category: it has a refine cell only.
  const runsValid = Object.entries(overrides.runs ?? {}).every(([row, cells]) =>
    (row in defaults.categories || (row === "workflow" && Object.keys(cells).every((p) => p === "refine")))
    && Object.entries(cells).every(([p, run]) =>
      phase(p) && isValidRunConfig(run)
      && Object.entries(run?.roles ?? {}).length <= MAX_ROLES_PER_CELL
      && Object.entries(run?.roles ?? {}).every(([role, own]) => ROLE_ID.test(role) && isValidRunConfig(own))));
  const modsValid = Object.entries(overrides.mods ?? {}).every(([row, cells]) =>
    (row in defaults.categories || row in defaults.signals)
    && Object.entries(cells).every(([p, mods]) =>
      phase(p) && Array.isArray(mods) && mods.length <= MAX_MODS_PER_CELL && mods.every((m) => ROLE_ID.test(m))));
  return rolesValid && runsValid && modsValid;
}

/* ---- A role's place in a matrix: what its sheet draws (JAVA-517) ---- */

/** A cell a role holds, category rows (plus `spike/ux-ui`) or signal rows. */
export interface RoleCell {
  row: string;
  phase: Phase;
}

function cellsHolding(rows: RoleMatrix["categories"], role: string): RoleCell[] {
  const cells: RoleCell[] = [];
  for (const phase of PHASES) for (const [row, cell] of Object.entries(rows)) if (cell[phase]?.includes(role)) cells.push({ row, phase });
  return cells;
}

/** The category cells that name `role`, phase by phase. */
export function roleCells(matrix: RoleMatrix, role: string): RoleCell[] {
  return cellsHolding(matrix.categories, role);
}

/** The signal cells that name `role`: what brings it in beyond a card's category. */
export function roleSignalCells(matrix: RoleMatrix, role: string): RoleCell[] {
  return cellsHolding(matrix.signals, role);
}

/** Every phase `role` works in, through a category or a signal, in the workflow's order. */
export function rolePhases(matrix: RoleMatrix, role: string): Phase[] {
  const held = new Set([...roleCells(matrix, role), ...roleSignalCells(matrix, role)].map((c) => c.phase));
  return PHASES.filter((phase) => held.has(phase));
}

/** The phase where `role` holds the most category cells (the earliest on a tie), or its first
 *  signal phase, or null when the matrix never names it. */
export function mainPhase(matrix: RoleMatrix, role: string): Phase | null {
  const cells = roleCells(matrix, role);
  if (cells.length === 0) return rolePhases(matrix, role)[0] ?? null;
  let best: Phase = cells[0].phase;
  let bestCount = 0;
  for (const phase of PHASES) {
    const count = cells.filter((c) => c.phase === phase).length;
    if (count > bestCount) [best, bestCount] = [phase, count];
  }
  return best;
}

/** Which category rows of one phase a project's matrix gave `role` beyond the default, and which
 *  it took away. */
export function phaseDelta(
  matrix: RoleMatrix,
  defaults: RoleMatrix,
  role: string,
  phase: Phase,
): { added: string[]; removed: string[] } {
  const rows = (m: RoleMatrix) => roleCells(m, role).filter((c) => c.phase === phase).map((c) => c.row);
  const now = rows(matrix);
  const before = rows(defaults);
  return { added: now.filter((r) => !before.includes(r)), removed: before.filter((r) => !now.includes(r)) };
}

/** The phases the matrix gives `role` that its atom's Phase Contract doesn't name. Empty when the
 *  atom names no phase at all: an atom that says nothing isn't contradicting anything. */
export function unnamedPhases(matrix: RoleMatrix, role: string, atomPhases: readonly Phase[]): Phase[] {
  if (atomPhases.length === 0) return [];
  return rolePhases(matrix, role).filter((phase) => !atomPhases.includes(phase));
}
