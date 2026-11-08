// Mods and role sheets from Fluxor's catalog (card://JAVA-1569, ADR 0018): the wire shapes of mods.list, mods.get and
// roles.get. Type-only, so node's test runner loads the modules that use them as they are.

/** A mod in `mods.list`: no body, so the whole catalog stays a small read. */
export interface ModSummary {
  modId: string;
  version: number;
  title: string;
  description: string;
  tags: string[];
  domains: string[];
  /** The mods it excludes: the two never run on one card. */
  incompatibleWith: string[];
  /** The roles whose sheet requires it: they always follow it. */
  requiredBy: string[];
}

/** `mods.get`: a mod's sheet, its `body` in Markdown. */
export interface ModSheet extends ModSummary {
  body: string;
}

/** `roles.get`: a role's sheet, its `body` in Markdown (it holds the Phase Contract). */
export interface RoleSheet {
  roleId: string;
  version: number;
  title: string;
  description: string;
  body: string;
}

/** A role in `roles.list`: no body, so the whole catalog stays a small read. `board` in `tags` marks the roles that work cards. */
export interface RoleSummary {
  roleId: string;
  version: number;
  title: string;
  description: string;
  tags: string[];
}

/** What a mod needs to be resolved against on a card: the floor of each role, and the pairs that exclude each other. */
export interface ModRules {
  requiredByRole: Record<string, string[]>;
  incompatible: Record<string, string[]>;
}
