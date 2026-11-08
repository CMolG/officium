// The memory build's twin of `FluxorRoleCatalog` (card://JAVA-1569): a few of the market's real mods (`mod-fixtures.json`,
// copied from `packages/fluxor-market/market/mods/`), the mods each review role requires, and the roles the default
// matrix names (`role-fixtures.json`, the Phase Contract of each one), so the demo and the e2e suite read the same
// shapes the API serves.
import { ApiError } from "../api-error";
import type { ModRules, ModSheet, ModSummary, RoleSheet, RoleSummary } from "../mod-types";
import { rulesOf } from "../role-mods";
import fixtures from "./mod-fixtures.json";
import roleFixtures from "./role-fixtures.json";

interface Fixture {
  modId: string;
  version: number;
  title: string;
  description: string;
  tags: string[];
  domains: string[];
  incompatibleWith: string[];
  body: string;
}

const REQUIRES = fixtures.requires as Record<string, string[]>;

/** Every fixture mod with `requiredBy` turned around from the roles' `requires`, and `incompatibleWith` made symmetric. */
const MODS: ModSheet[] = (fixtures.mods as Fixture[]).map((mod) => ({
  ...mod,
  incompatibleWith: [...new Set([...mod.incompatibleWith, ...(fixtures.mods as Fixture[]).filter((o) => o.incompatibleWith.includes(mod.modId)).map((o) => o.modId)])].sort(),
  requiredBy: Object.keys(REQUIRES).filter((role) => REQUIRES[role].includes(mod.modId)).sort(),
}));

const summary = ({ body: _body, ...rest }: ModSheet): ModSummary => rest;

export const memoryModSummaries = (): ModSummary[] => structuredClone(MODS.map(summary));

export function memoryModSheet(modId: string): ModSheet {
  const mod = MODS.find((m) => m.modId === modId);
  if (!mod) throw new ApiError("unknown_mod", `Fluxor's catalog has no mod ${modId}: skip it, or ask for mods.list`, 404);
  return structuredClone(mod);
}

/** What `FluxorRoleCatalog.rules()` serves: each role's required mods, and the pairs that exclude each other. */
export const MEMORY_MOD_RULES: ModRules = rulesOf(MODS.map(summary));

interface RoleFixture extends RoleSheet {
  tags: string[];
}

const ROLES = roleFixtures as RoleFixture[];

/** `roles.list` in the memory build: the roles without their bodies. */
export const memoryRoleSummaries = (): RoleSummary[] => structuredClone(ROLES.map(({ body: _body, ...rest }) => rest));

/** `roles.get` in the memory build: the role's sheet, its Phase Contract in Markdown, as the catalog serves it. */
export function memoryRoleSheet(roleId: string): RoleSheet {
  const role = ROLES.find((r) => r.roleId === roleId);
  if (!role) throw new ApiError("unknown_role", `Fluxor's catalog has no role ${roleId}: work the card under its category's contract`, 404);
  const { tags: _tags, ...sheet } = role;
  return structuredClone(sheet);
}
