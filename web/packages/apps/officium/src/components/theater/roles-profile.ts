import type { RoleRepository } from "../../lib/backlog/role-repository";
import { DEFAULT_ROLE_MATRIX } from "../../lib/backlog/role-config";
import type { RoleMatrix } from "../../lib/backlog/role-matrix-types";
import { ecoOverrides } from "../../lib/profiles/builtins";
import { PROFILE_ECO } from "./roles-script";

const NO_OVERRIDES: RoleMatrix = { categories: {}, signals: {}, runs: {} };

/**
 * Sets the project's role matrix to one of the scene's choices, through the repository the
 * scene owns: it never touches the profiles client, whose state is shared across passes.
 * `PROFILE_DEFAULTS` clears the overrides, so the matrix is Officium's own again.
 */
export async function applyProfile(
  repository: RoleRepository,
  projectId: string,
  choice: string,
): Promise<void> {
  const view = await repository.getRoleMatrix(projectId);
  const overrides =
    choice === PROFILE_ECO ? ecoOverrides(Object.keys(DEFAULT_ROLE_MATRIX.categories)) : NO_OVERRIDES;
  await repository.setRoleMatrix(projectId, { expectedVersion: view.version, overrides });
}
