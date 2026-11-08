import type { ModSheet, ModSummary, RoleMatrix, RoleMatrixView, RoleSheet, RoleSummary, WriteResult } from "../types";
import { ApiError } from "../api-error";
import { DEFAULT_ROLE_MATRIX } from "../role-config";
import { isValidOverrides } from "../role-matrix";
import { YOU } from "../memory-seed";
import { activeProfileId, activeProfileMatrix } from "../../profiles/memory-profiles";
import { ownerCanEdit } from "../../billing/owner-plan";
import { now } from "./rules";
import { memoryModSheet, memoryModSummaries, memoryRoleSheet, memoryRoleSummaries } from "./mod-catalog";
import { MemoryPrecedence } from "./precedence";

const CELLS = ["categories", "signals", "runs", "mods"] as const;

/** Whether a stored override holds any cell at all. */
const hasOverrides = (overrides: RoleMatrix): boolean => CELLS.some((key) => Object.keys(overrides[key] ?? {}).length > 0);

/** Whether two matrices name the same cells: a write that leaves them so changes nothing the plan has to cover. */
const sameMatrix = (a: RoleMatrix, b: RoleMatrix): boolean =>
  CELLS.every((key) => JSON.stringify(a[key] ?? {}) === JSON.stringify(b[key] ?? {}));

export class MemoryRoles extends MemoryPrecedence {
  protected roleMatrixView(projectId: string): RoleMatrixView {
    const stored = this.requireRecord(projectId).roleMatrix;
    return structuredClone({
      projectId,
      effective: this.matrixOf(projectId),
      // As sent, like the server: the view is what keeps it to the cells that differ.
      overrides: stored.overrides,
      version: stored.version,
      updatedAt: stored.updatedAt,
      activeProfileId: activeProfileId(projectId),
      base: activeProfileMatrix(projectId),
      editable: ownerCanEdit(),
      overridesInactive: !ownerCanEdit() && hasOverrides(stored.overrides),
    });
  }

  async getRoleMatrix(projectId: string): Promise<RoleMatrixView> {
    await this.holds.get("getRoleMatrix")?.promise;
    this.count("getRoleMatrix");
    return this.roleMatrixView(projectId);
  }

  async setRoleMatrix(
    projectId: string,
    input: { expectedVersion: number; overrides: RoleMatrix },
  ): Promise<WriteResult<RoleMatrixView>> {
    const record = this.requireRecord(projectId);
    // Same order as `RoleMatrixService.set`: owner first, then the version.
    if (record.project.role !== "owner") {
      throw new ApiError("owner_only", "Only the project's owner changes which roles work its cards", 403);
    }
    if (!isValidOverrides(input.overrides, DEFAULT_ROLE_MATRIX)) {
      throw new ApiError("invalid_role_matrix", "Unknown row, phase or signal, a malformed role, model or effort, or more than 20 in a cell", 400);
    }
    if (record.roleMatrix.version !== input.expectedVersion) {
      return {
        error: "version_conflict",
        message: "The project's role matrix changed since you last read it",
        current: this.roleMatrixView(projectId),
      };
    }
    // Like `RoleMatrixService.set` (JAVA-1007): a changed cell needs the owner's plan, a re-save of the same cells does not.
    const written = {
      ...input.overrides,
      runs: input.overrides.runs ?? record.roleMatrix.overrides.runs,
      mods: input.overrides.mods ?? record.roleMatrix.overrides.mods,
    };
    if (!ownerCanEdit() && !sameMatrix(written, record.roleMatrix.overrides)) {
      throw new ApiError("plan_required", "Changing roles, models and efforts per category is part of the Personal plan", 403);
    }
    record.roleMatrix = {
      // Like the server (JAVA-915, JAVA-1569): a write naming no runs or no mods keeps the project's.
      overrides: structuredClone(written),
      version: record.roleMatrix.version + 1,
      updatedAt: now(),
    };
    this.emit(projectId, { type: "project.roleMatrix", version: record.roleMatrix.version, actor: YOU });
    return this.roleMatrixView(projectId);
  }

  // ---- mods and roles from Fluxor's catalog (card://JAVA-1569) ---------------------------------

  async listMods(projectId: string): Promise<ModSummary[]> {
    this.requireRecord(projectId);
    await this.holds.get("listMods")?.promise;
    this.count("listMods");
    return memoryModSummaries();
  }

  async getMod(projectId: string, modId: string): Promise<ModSheet> {
    this.requireRecord(projectId);
    await this.holds.get("getMod")?.promise;
    this.count("getMod");
    return memoryModSheet(modId);
  }

  async listRoles(projectId: string): Promise<RoleSummary[]> {
    this.requireRecord(projectId);
    await this.holds.get("listRoles")?.promise;
    this.count("listRoles");
    return memoryRoleSummaries();
  }

  async getRole(projectId: string, roleId: string): Promise<RoleSheet> {
    this.requireRecord(projectId);
    this.count("getRole");
    return memoryRoleSheet(roleId);
  }
}
