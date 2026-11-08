import type { ModSheet, ModSummary, RoleMatrix, RoleMatrixView, RoleSheet, RoleSummary, WriteResult } from "../types";
import { ApiExecutionMode } from "./execution-mode";

export class ApiRoles extends ApiExecutionMode {
  async getRoleMatrix(projectId: string): Promise<RoleMatrixView> {
    return this.request<RoleMatrixView>(`/projects/${projectId}/role-matrix`);
  }

  async setRoleMatrix(
    projectId: string,
    input: { expectedVersion: number; overrides: RoleMatrix },
  ): Promise<WriteResult<RoleMatrixView>> {
    return this.requestVersioned<RoleMatrixView>(`/projects/${projectId}/role-matrix`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  // ---- mods and roles from Fluxor's catalog (card://JAVA-1569) ---------------------------------

  async listMods(projectId: string): Promise<ModSummary[]> {
    return (await this.request<{ mods: ModSummary[] }>(`/projects/${projectId}/mods`)).mods;
  }

  async getMod(projectId: string, modId: string): Promise<ModSheet> {
    return this.request<ModSheet>(`/projects/${projectId}/mods/${encodeURIComponent(modId)}`);
  }

  async listRoles(projectId: string): Promise<RoleSummary[]> {
    return (await this.request<{ roles: RoleSummary[] }>(`/projects/${projectId}/roles`)).roles;
  }

  async getRole(projectId: string, roleId: string): Promise<RoleSheet> {
    return this.request<RoleSheet>(`/projects/${projectId}/roles/${encodeURIComponent(roleId)}`);
  }
}
