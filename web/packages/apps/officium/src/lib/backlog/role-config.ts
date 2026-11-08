import roleMatrix from "./role-matrix.json";
import type { ModRules } from "./mod-types";
import { resolveMods } from "./role-mods";
import type { Category, Phase, RoleMatrix, RunConfig, Signal, SpikeSubtype, Status } from "./types";

/**
 * Which roles may work a card (JAVA-294). The API computes it: every card it returns carries
 * `eligibleRoles`, under the project's own matrix. This module is what the board needs on top of
 * that: the signals' names, a role id as words, and -- for the in-memory repository only, which
 * has no server -- the same computation over `role-matrix.json`, a copy of the server's default
 * that `scripts/test/officium-role-matrix.test.mjs` keeps identical to `RoleMatrix.java`.
 */
export const SIGNAL_ORDER: readonly Signal[] = [
  "touches-auth-permissions-or-personal-data",
  "touches-ui",
  "touches-hot-paths-or-heavy-queries",
  "touches-data-schema",
  "touches-infrastructure",
];

/** What each signal means in the words of a person picking it. */
export const SIGNAL_LABEL: Record<Signal, string> = {
  "touches-auth-permissions-or-personal-data": "Auth, permissions or personal data",
  "touches-ui": "User interface",
  "touches-hot-paths-or-heavy-queries": "Hot paths or heavy queries",
  "touches-data-schema": "Data schema",
  "touches-infrastructure": "Infrastructure",
};

/** What each signal is about, in one line: what a person reads before adding one (JAVA-521). */
export const SIGNAL_HINT: Record<Signal, string> = {
  "touches-auth-permissions-or-personal-data": "Sign-in, who may do what, or data about a person.",
  "touches-ui": "Something a person sees or uses on screen.",
  "touches-hot-paths-or-heavy-queries": "Code on a busy path, or a query that reads a lot of data.",
  "touches-data-schema": "A new or changed table, column or stored format.",
  "touches-infrastructure": "Servers, deployment, networking or CI.",
};

/** A spike's two subtypes (JAVA-391), each with the line a person reads before picking it. */
export const SPIKE_SUBTYPE_CONFIG: Record<SpikeSubtype, { label: string; hint: string }> = {
  technical: { label: "Technical", hint: "A technical question: research, a measurement or a proof of concept." },
  "ux-ui": { label: "UX/UI", hint: "A design or user-research question: a mockup, a flow or a usability test." },
};

export const SPIKE_SUBTYPE_ORDER: readonly SpikeSubtype[] = ["technical", "ux-ui"];

/** `Card`'s rule in the API: a spike always has a subtype (`technical` by default), nothing else has one. */
export function subtypeFor(category: Category | null, subtype: SpikeSubtype | null | undefined): SpikeSubtype | null {
  return category === "spike" ? (subtype ?? "technical") : null;
}

/** A role-matrix phase in the board's words. */
export const PHASE_LABEL: Record<Phase, string> = {
  refine: "Refine",
  action: "To do & In progress",
  ready: "Ready",
  review: "Review",
  deploy: "Deploy",
};

/** A Fluxor role id as words: `ux-ui-accessibility-reviewer` -> "UX/UI accessibility reviewer",
 *  `ux-researcher` -> "UX researcher". */
export function roleLabel(id: string): string {
  const words = id
    .replace(/^ux-ui\b/, "ux/ui")
    .replace(/-sre$/, "-SRE")
    .replace(/^qa-|-qa$/, (m) => m.toUpperCase())
    .split("-");
  const text = words.map((w) => (w === "ux/ui" || w === "ux" ? w.toUpperCase() : w)).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** What `Phase.of(Status)` says on the server: the phase a status asks for, or none for Done and Rejected. */
function phaseOf(status: Status): string | null {
  switch (status) {
    case "todo":
    case "doing":
      return "action";
    case "done":
    case "rejected":
      return null;
    default:
      return status;
  }
}

/** The server's default matrix, which a project with no override gets. */
export const DEFAULT_ROLE_MATRIX = roleMatrix as RoleMatrix;

/** `RoleMatrix.eligible` over a project's effective matrix, for the in-memory repository. */
export function eligibleRolesUnder(
  matrix: RoleMatrix,
  category: Category | null,
  subtype: SpikeSubtype | null,
  status: Status,
  signals: readonly Signal[],
): string[] {
  const phase = phaseOf(status) as Phase | null;
  if (!phase) return [];
  const present = SIGNAL_ORDER.filter((s) => signals.includes(s));
  const roles = new Set<string>();
  if (category) {
    // `RoleMatrix.rowFor`: a ux-ui spike reads its own row; a signal adds roles, never picks the row.
    const row = category === "spike" && subtype === "ux-ui" ? "spike/ux-ui" : category;
    for (const role of matrix.categories[row]?.[phase] ?? []) roles.add(role);
  }
  for (const signal of present) for (const role of matrix.signals[signal]?.[phase] ?? []) roles.add(role);
  return [...roles];
}

/** `RoleMatrix.runConfig` and `runConfigs` (JAVA-915): the category cell's model and effort in the
 *  status's phase, and each eligible role's (its override in that cell, else the cell's). */
export function runConfigsUnder(
  matrix: RoleMatrix,
  category: Category | null,
  subtype: SpikeSubtype | null,
  status: Status,
  signals: readonly Signal[],
): { runConfig: RunConfig | null; runConfigs: Record<string, RunConfig> } {
  const phase = phaseOf(status) as Phase | null;
  const cell = phase && category ? matrix.runs?.[category === "spike" && subtype === "ux-ui" ? "spike/ux-ui" : category]?.[phase] : null;
  if (!cell) return { runConfig: null, runConfigs: {} };
  const runConfigs: Record<string, RunConfig> = {};
  for (const role of eligibleRolesUnder(matrix, category, subtype, status, signals)) {
    const own = cell.roles?.[role];
    runConfigs[role] = { model: (own ?? cell).model, effort: (own ?? cell).effort };
  }
  return { runConfig: { model: cell.model, effort: cell.effort }, runConfigs };
}

/** `RoleMatrix.modsByRole` (card://JAVA-1569): each eligible role's mods, its required ones first, then the cell's and the
 *  signals' that do not exclude one already kept. A role with none is absent. */
export function modsUnder(
  matrix: RoleMatrix,
  rules: ModRules,
  category: Category | null,
  subtype: SpikeSubtype | null,
  status: Status,
  signals: readonly Signal[],
): Record<string, string[]> {
  const phase = phaseOf(status) as Phase | null;
  if (!phase) return {};
  const extra = new Set<string>();
  if (category) for (const mod of matrix.mods?.[category === "spike" && subtype === "ux-ui" ? "spike/ux-ui" : category]?.[phase] ?? []) extra.add(mod);
  for (const signal of SIGNAL_ORDER.filter((s) => signals.includes(s))) for (const mod of matrix.mods?.[signal]?.[phase] ?? []) extra.add(mod);
  const byRole: Record<string, string[]> = {};
  for (const role of eligibleRolesUnder(matrix, category, subtype, status, signals)) {
    const mods = resolveMods(rules, role, [...extra]);
    if (mods.length) byRole[role] = mods;
  }
  return byRole;
}

export function defaultEligibleRoles(
  category: Category | null,
  subtype: SpikeSubtype | null,
  status: Status,
  signals: readonly Signal[],
): string[] {
  return eligibleRolesUnder(DEFAULT_ROLE_MATRIX, category, subtype, status, signals);
}

export type { RoleAtom } from "./role-sheet";

/** A mod's description is a paragraph; a list's or a picker's line is its first sentence. */
export function firstSentence(text: string): string {
  const sentence = text.match(/^.{20,170}?\.(?=\s|$)/)?.[0];
  if (sentence) return sentence.trim();
  return text.length <= 170 ? text.trim() : `${text.slice(0, 170).replace(/\s+\S*$/, "")}…`;
}

/** A mod id as words, the way a role's is: `rule-enforcer` -> "Rule enforcer". */
export const modLabel = roleLabel;

/** A mod's sheet (card://JAVA-1569). */
export function modSheetHref(mod: string): string {
  return `/app/configuration/roles/m/${encodeURIComponent(mod)}`;
}

/** A role's sheet. */
export function roleSheetHref(role: string): string {
  return `/app/configuration/roles/r/${encodeURIComponent(role)}`;
}

/** What a role mostly does, by the phase it works most: the sheet's kicker and the index groups. */
export const PHASE_VERB: Record<Phase, string> = {
  refine: "Plans",
  action: "Builds",
  ready: "Hands over",
  review: "Verifies",
  deploy: "Ships",
};

/** The status whose polygon draws a phase: Refine 3 sides, Action 4, Ready 6, Review 7, Deploy 8. */
export const PHASE_STATUS: Record<Phase, Status> = {
  refine: "refine",
  action: "todo",
  ready: "ready",
  review: "review",
  deploy: "deploy",
};
