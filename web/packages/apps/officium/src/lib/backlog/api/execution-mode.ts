import type { ExecutionModeSet, ExecutionModeSetting } from "../execution-mode-repository";
import type { WriteResult } from "../types";
import { ApiFormLanguages } from "./form-languages";

/** `GET`/`PUT /projects/{id}/execution-mode` (card://JAVA-1878). */
export class ApiExecutionMode extends ApiFormLanguages {
  async getExecutionMode(projectId: string): Promise<ExecutionModeSetting> {
    return this.request<ExecutionModeSetting>(`/projects/${projectId}/execution-mode`);
  }

  async setExecutionMode(
    projectId: string,
    input: { expectedVersion: number; mode: "card" | "epic"; dryRun?: boolean },
  ): Promise<WriteResult<ExecutionModeSet>> {
    return this.requestVersioned<ExecutionModeSet>(`/projects/${projectId}/execution-mode`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }
}
