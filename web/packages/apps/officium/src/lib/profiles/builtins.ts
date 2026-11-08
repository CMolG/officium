// The built-in work profiles (card://JAVA-1524), twins of `WorkProfiles.java`: the in-memory backend gives them
// to every account, as the API does. `scripts/test/officium-work-profiles.test.mjs` pins them to the Java side.
import type { Effort, RoleMatrix, RunRow } from "../backlog/role-matrix-types";

export const STANDARD = "claude-standard";
export const ECO = "claude-eco";

const SONNET = "claude-sonnet-5-5";
const OPUS = "claude-opus-5-5";
const RULE_ENFORCER = "rule-enforcer";
const CRITICAL_ACTION = ["spike", "spike/ux-ui", "security"];

const run = (model: string, effort: Effort) => ({ model, effort });

/** Eco's overlay: plans on Opus at high (card://JAVA-2091), Sonnet in every other phase, cheaper by effort only (card://JAVA-1884). */
export function ecoOverrides(rows: readonly string[]): RoleMatrix {
  const runs: Record<string, RunRow> = {};
  for (const row of rows) {
    runs[row] = {
      refine: run(OPUS, "high"),
      action: run(SONNET, CRITICAL_ACTION.includes(row) ? "high" : "medium"),
      ready: run(SONNET, "high"),
      review: run(SONNET, "high"),
      deploy: run(SONNET, "low"),
    };
  }
  return { categories: {}, signals: {}, runs };
}

/** Standard's overlay (card://JAVA-1569): Officium's defaults, with the rule-enforcer mod on every row's Review cell. */
export function standardOverrides(rows: readonly string[]): RoleMatrix {
  const mods: Record<string, { review: string[] }> = {};
  for (const row of rows) mods[row] = { review: [RULE_ENFORCER] };
  return { categories: {}, signals: {}, runs: {}, mods };
}

/** Whether a build cell of `profileId` may be asked to run `model`: Eco builds on Sonnet only (card://JAVA-1884). */
export const allows = (profileId: string, model: string) => profileId !== ECO || model === SONNET;

export const BUILTIN_NAMES: Record<string, string> = { [STANDARD]: "Claude Standard", [ECO]: "Claude Eco" };
