import type { ModRules, ModSummary } from "./mod-types";

/**
 * How mods stack on a card (card://JAVA-1569), twin of `ModRules.java`: a role's required mods are its floor, a cell's
 * and a signal's mods come after, and a mod that excludes one already kept is left out. The cell's own mods
 * (`matrix.mods[row][phase]`) are edited with `role-matrix.ts`. Pure, with type-only imports, so
 * `scripts/test/officium-role-mods.test.mjs` runs it under plain `node --test`.
 */

/** `ModRules.exclude`: whether either of the two lists the other as incompatible. */
export function excludes(rules: ModRules, a: string, b: string): boolean {
  return (rules.incompatible[a] ?? []).includes(b) || (rules.incompatible[b] ?? []).includes(a);
}

/** The rules a mod catalog gives: each mod's `requiredBy` turned around, and its `incompatibleWith`. */
export function rulesOf(mods: readonly ModSummary[]): ModRules {
  const requiredByRole: Record<string, string[]> = {};
  const incompatible: Record<string, string[]> = {};
  for (const mod of mods) {
    for (const role of mod.requiredBy) (requiredByRole[role] ??= []).push(mod.modId);
    if (mod.incompatibleWith.length) incompatible[mod.modId] = [...mod.incompatibleWith];
  }
  return { requiredByRole, incompatible };
}

/** What a role follows given the extra mods of a cell: its required ones first, then the extras that do not exclude one
 *  already kept, each once (`ModRules.resolve`). */
export function resolveMods(rules: ModRules, role: string, extra: readonly string[]): string[] {
  const kept = [...(rules.requiredByRole[role] ?? [])];
  for (const mod of extra) {
    if (!kept.includes(mod) && !kept.some((other) => excludes(rules, mod, other))) kept.push(mod);
  }
  return kept;
}

/** A warning for a cell that holds `mods`: each pair of them that excludes each other, in words, and each mod that
 *  excludes one a role of the cell requires. `label` says a mod in words. */
export function cellWarnings(
  rules: ModRules,
  mods: readonly string[],
  roles: readonly string[],
  label: (id: string) => string,
): string[] {
  const warnings: string[] = [];
  mods.forEach((mod, i) => {
    for (const other of mods.slice(i + 1)) {
      if (excludes(rules, mod, other)) warnings.push(`${label(mod)} and ${label(other)} exclude each other: ${label(other)} is left out.`);
    }
    const floor = roles.flatMap((role) => rules.requiredByRole[role] ?? []);
    for (const required of new Set(floor)) {
      if (required !== mod && excludes(rules, mod, required)) warnings.push(`${label(mod)} excludes ${label(required)}, which a role here requires: ${label(mod)} is left out.`);
    }
  });
  return warnings;
}
