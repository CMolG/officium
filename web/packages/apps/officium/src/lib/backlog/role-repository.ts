import type { ModSheet, ModSummary, RoleSheet, RoleSummary } from "./mod-types";
import type { RoleMatrix, RoleMatrixView } from "./role-matrix-types";
import type { WriteResult } from "./types";

/** Which roles, models and mods work a project's cards (officium-api.md §8.9), and the roles and mods of Fluxor's catalog. */
export interface RoleRepository {
  /** officium-api.md §8.9 (JAVA-243): the default matrix with the project's override. */
  getRoleMatrix(projectId: string): Promise<RoleMatrixView>;
  /** Replaces the override (`{categories: {}, signals: {}}` goes back to the defaults). Owner only
   *  (`403 owner_only`, thrown); `invalid_role_matrix` (400) throws too. */
  setRoleMatrix(
    projectId: string,
    input: { expectedVersion: number; overrides: RoleMatrix },
  ): Promise<WriteResult<RoleMatrixView>>;

  /** officium-api.md §8.9 (card://JAVA-1569): the mods of Fluxor's catalog, without their bodies. */
  listMods(projectId: string): Promise<ModSummary[]>;
  /** A mod's sheet, its body in Markdown; `404 unknown_mod` throws (a role's id is no mod's). */
  getMod(projectId: string, modId: string): Promise<ModSheet>;
  /** The roles of Fluxor's catalog without their bodies (card://JAVA-534): the index's taglines and the board roles. */
  listRoles(projectId: string): Promise<RoleSummary[]>;
  /** A role's sheet from Fluxor's catalog (ADR 0018), its body in Markdown; `404 unknown_role` throws. */
  getRole(projectId: string, roleId: string): Promise<RoleSheet>;
}
